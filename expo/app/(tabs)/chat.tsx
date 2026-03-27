import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Send,
  Users,
  UserPlus,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';
import { ChatMember, ChatMessage } from '@/types';
import ManageMembersModal from '@/components/ManageMembersModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ROLE_COLORS: Record<ChatMember['role'], string> = {
  coach: '#3B82F6',
  player: '#10B981',
  parent: '#F59E0B',
};

const STORAGE_KEY_MEMBERS = 'chat_members';
const STORAGE_KEY_MESSAGES = 'chat_messages';

const INITIAL_MEMBERS: ChatMember[] = [
  { id: 'admin', name: 'Coach (You)', role: 'coach' },
  { id: 'm1', name: 'Marcus Johnson', email: 'marcus.j@email.com', role: 'player' },
  { id: 'm2', name: 'Tyler Rodriguez', email: 'tyler.r@email.com', role: 'player' },
  { id: 'm3', name: 'Jayden Williams', email: 'jayden.w@email.com', role: 'player' },
  { id: 'm4', name: 'Sarah Johnson', email: 'sarah.johnson@email.com', role: 'parent' },
  { id: 'm5', name: 'Michael Rodriguez', email: 'michael.r@email.com', role: 'parent' },
  { id: 'm6', name: 'Coach Thompson', email: 'thompson@email.com', role: 'coach' },
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg1',
    senderId: 'admin',
    senderName: 'Coach (You)',
    senderRole: 'coach',
    text: 'Great practice today team! Keep up the energy.',
    timestamp: Date.now() - 3600000 * 3,
  },
  {
    id: 'msg2',
    senderId: 'm1',
    senderName: 'Marcus Johnson',
    senderRole: 'player',
    text: 'Thanks coach! Feeling good about the game tomorrow.',
    timestamp: Date.now() - 3600000 * 2.5,
  },
  {
    id: 'msg3',
    senderId: 'm4',
    senderName: 'Sarah Johnson',
    senderRole: 'parent',
    text: 'What time should we arrive for the game?',
    timestamp: Date.now() - 3600000 * 2,
  },
  {
    id: 'msg4',
    senderId: 'admin',
    senderName: 'Coach (You)',
    senderRole: 'coach',
    text: 'Doors open at 5:30pm, warmups start at 6pm. Game tips off at 6:30pm.',
    timestamp: Date.now() - 3600000 * 1.5,
  },
  {
    id: 'msg5',
    senderId: 'm6',
    senderName: 'Coach Thompson',
    senderRole: 'coach',
    text: 'I\'ll have the lineup ready by tomorrow morning.',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'msg6',
    senderId: 'm2',
    senderName: 'Tyler Rodriguez',
    senderRole: 'player',
    text: 'Let\'s get this W! 💪',
    timestamp: Date.now() - 1800000,
  },
  {
    id: 'msg7',
    senderId: 'm5',
    senderName: 'Michael Rodriguez',
    senderRole: 'parent',
    text: 'Game time changed to 6pm right? Just confirming.',
    timestamp: Date.now() - 900000,
  },
];

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  const min = m < 10 ? `0${m}` : m;
  return `${hour}:${min} ${ampm}`;
};

const formatDateSeparator = (ts: number) => {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

type ScreenView = 'threads' | 'conversation';

export default function ChatScreen() {
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [view, setView] = useState<ScreenView>('threads');
  const [members, setMembers] = useState<ChatMember[]>(INITIAL_MEMBERS);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState<string>('');
  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [showMemberBar, setShowMemberBar] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);

  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const load = async () => {
      try {
        const [storedMembers, storedMessages] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_MEMBERS),
          AsyncStorage.getItem(STORAGE_KEY_MESSAGES),
        ]);
        if (storedMembers) setMembers(JSON.parse(storedMembers));
        if (storedMessages) setChatMessages(JSON.parse(storedMessages));
      } catch (e) {
        console.log('Error loading chat data:', e);
      } finally {
        setDataLoaded(true);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (!dataLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEY_MEMBERS, JSON.stringify(members));
  }, [members, dataLoaded]);

  useEffect(() => {
    if (!dataLoaded) return;
    void AsyncStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(chatMessages));
  }, [chatMessages, dataLoaded]);

  const openConversation = useCallback(() => {
    setView('conversation');
    Animated.spring(slideAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [slideAnim]);

  const goBack = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setView('threads');
    });
  }, [slideAnim]);

  const sendMessage = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: 'admin',
      senderName: user?.fullName || 'Coach (You)',
      senderRole: 'coach',
      text: trimmed,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setInputText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [inputText, user?.fullName]);

  const addMember = useCallback((name: string, role: ChatMember['role'], email: string) => {
    const newMember: ChatMember = {
      id: `member_${Date.now()}`,
      name,
      email,
      role,
    };
    setMembers((prev) => [...prev, newMember]);

    const systemMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'coach',
      text: `${name} (${email}) was added as a ${role.charAt(0).toUpperCase() + role.slice(1)}.`,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, systemMsg]);
  }, []);

  const removeMember = useCallback((id: string) => {
    const member = members.find((m) => m.id === id);
    if (!member) return;

    setMembers((prev) => prev.filter((m) => m.id !== id));

    const systemMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      senderId: 'system',
      senderName: 'System',
      senderRole: 'coach',
      text: `${member.name} was removed from the group.`,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, systemMsg]);
  }, [members]);

  const lastMessage = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

  const renderThreadItem = () => (
    <TouchableOpacity
      style={styles.threadCard}
      activeOpacity={0.7}
      onPress={openConversation}
      testID="team-thread"
    >
      <View style={styles.threadAvatar}>
        <Users size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.threadContent}>
        <View style={styles.threadHeader}>
          <Text style={styles.threadName}>Team Chat</Text>
          <Text style={styles.threadTime}>
            {lastMessage ? formatTime(lastMessage.timestamp) : ''}
          </Text>
        </View>
        <View style={styles.threadSubRow}>
          <Text style={styles.threadPreview} numberOfLines={1}>
            {lastMessage
              ? `${lastMessage.senderId === 'admin' ? 'You' : lastMessage.senderName.split(' ')[0]}: ${lastMessage.text}`
              : 'No messages yet'}
          </Text>
          <View style={styles.memberCountBadge}>
            <Text style={styles.memberCountText}>{members.length}</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={18} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMe = item.senderId === 'admin';
    const isSystem = item.senderId === 'system';
    const prevMsg = index > 0 ? chatMessages[index - 1] : null;
    const showSender = !isMe && !isSystem && (!prevMsg || prevMsg.senderId !== item.senderId);

    const showDateSep =
      !prevMsg ||
      new Date(prevMsg.timestamp).toDateString() !== new Date(item.timestamp).toDateString();

    return (
      <View>
        {showDateSep && (
          <View style={styles.dateSeparator}>
            <View style={styles.dateLine} />
            <Text style={styles.dateText}>{formatDateSeparator(item.timestamp)}</Text>
            <View style={styles.dateLine} />
          </View>
        )}
        {isSystem ? (
          <View style={styles.systemMsgRow}>
            <Text style={styles.systemMsgText}>{item.text}</Text>
          </View>
        ) : (
          <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
            {!isMe && showSender && (
              <View
                style={[
                  styles.msgAvatar,
                  { backgroundColor: ROLE_COLORS[item.senderRole] + '25' },
                ]}
              >
                <Text style={[styles.msgAvatarText, { color: ROLE_COLORS[item.senderRole] }]}>
                  {getInitials(item.senderName)}
                </Text>
              </View>
            )}
            {!isMe && !showSender && <View style={styles.msgAvatarSpacer} />}
            <View style={styles.msgBubbleWrap}>
              {showSender && !isMe && (
                <View style={styles.senderRow}>
                  <Text style={[styles.senderName, { color: ROLE_COLORS[item.senderRole] }]}>
                    {item.senderName}
                  </Text>
                  <View
                    style={[styles.senderDot, { backgroundColor: ROLE_COLORS[item.senderRole] }]}
                  />
                  <Text style={styles.senderRole}>
                    {item.senderRole.charAt(0).toUpperCase() + item.senderRole.slice(1)}
                  </Text>
                </View>
              )}
              <View style={[styles.msgBubble, isMe ? styles.msgBubbleMe : styles.msgBubbleOther]}>
                <Text style={[styles.msgText, isMe && styles.msgTextMe]}>{item.text}</Text>
                <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderMemberBar = () => {
    if (!showMemberBar) return null;
    return (
      <View style={styles.memberBarContainer}>
        <FlatList
          horizontal
          data={members}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.memberBarList}
          renderItem={({ item }) => (
            <View style={styles.memberBarItem}>
              <View
                style={[
                  styles.memberBarAvatar,
                  { backgroundColor: ROLE_COLORS[item.role] + '25' },
                ]}
              >
                <Text
                  style={[styles.memberBarAvatarText, { color: ROLE_COLORS[item.role] }]}
                >
                  {getInitials(item.name)}
                </Text>
              </View>
              <Text style={styles.memberBarName} numberOfLines={1}>
                {item.id === 'admin' ? 'You' : item.name.split(' ')[0]}
              </Text>
              <View
                style={[styles.memberBarRoleDot, { backgroundColor: ROLE_COLORS[item.role] }]}
              />
            </View>
          )}
        />
      </View>
    );
  };

  if (view === 'conversation') {
    return (
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.convHeader}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} testID="back-btn">
            <ArrowLeft size={22} color={theme.colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.convHeaderCenter}
            onPress={() => setShowMemberBar(!showMemberBar)}
            activeOpacity={0.7}
          >
            <View style={styles.convHeaderIcon}>
              <Users size={18} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.convHeaderTitle}>Team Chat</Text>
              <Text style={styles.convHeaderSub}>{members.length} members</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.manageBtn}
            onPress={() => setShowManageModal(true)}
            testID="manage-members-btn"
          >
            <UserPlus size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {renderMemberBar()}

        <FlatList
          ref={flatListRef}
          data={chatMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          style={styles.messageList}
          contentContainerStyle={[styles.messageListContent, { paddingBottom: 10 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
        />

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            returnKeyType="default"
            testID="chat-input"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim()}
            testID="send-btn"
          >
            <Send size={20} color={inputText.trim() ? '#FFF' : theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ManageMembersModal
          visible={showManageModal}
          onClose={() => setShowManageModal(false)}
          members={members}
          onAddMember={addMember}
          onRemoveMember={removeMember}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <View style={styles.threadsList}>
        {renderThreadItem()}

        <View style={styles.emptyHint}>
          <Text style={styles.emptyHintText}>
            Tap on the team chat to start messaging
          </Text>
        </View>
      </View>

      <ManageMembersModal
        visible={showManageModal}
        onClose={() => setShowManageModal(false)}
        members={members}
        onAddMember={addMember}
        onRemoveMember={removeMember}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  threadsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  threadAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadContent: {
    flex: 1,
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  threadName: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  threadTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  threadSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  threadPreview: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  memberCountBadge: {
    backgroundColor: theme.colors.primary,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCountText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  emptyHint: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyHintText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  convHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
    gap: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  convHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  convHeaderTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  convHeaderSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  manageBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberBarContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
    paddingVertical: 10,
  },
  memberBarList: {
    paddingHorizontal: 14,
    gap: 14,
  },
  memberBarItem: {
    alignItems: 'center',
    width: 56,
  },
  memberBarAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  memberBarAvatarText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  memberBarName: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  memberBarRoleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    gap: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.surface,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  systemMsgRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  systemMsgText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic' as const,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 2,
  },
  msgAvatarText: {
    fontSize: 11,
    fontWeight: '700' as const,
  },
  msgAvatarSpacer: {
    width: 40,
  },
  msgBubbleWrap: {
    maxWidth: '75%',
  },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
    paddingLeft: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  senderDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  senderRole: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 2,
  },
  msgBubbleMe: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 6,
  },
  msgBubbleOther: {
    backgroundColor: theme.colors.surface,
    borderBottomLeftRadius: 6,
  },
  msgText: {
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 20,
  },
  msgTextMe: {
    color: '#FFF',
  },
  msgTime: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surface,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: theme.colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: theme.colors.surface,
  },
});
