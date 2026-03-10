import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, UserPlus, Trash2, Shield, Users, ChevronDown, Mail, User } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { ChatMember } from '@/types';

interface ManageMembersModalProps {
  visible: boolean;
  onClose: () => void;
  members: ChatMember[];
  onAddMember: (name: string, role: ChatMember['role'], email: string) => void;
  onRemoveMember: (id: string) => void;
}

const ROLE_COLORS: Record<ChatMember['role'], string> = {
  coach: '#3B82F6',
  player: '#10B981',
  parent: '#F59E0B',
};

const ROLE_LABELS: Record<ChatMember['role'], string> = {
  coach: 'Coach',
  player: 'Player',
  parent: 'Parent',
};

export default function ManageMembersModal({
  visible,
  onClose,
  members,
  onAddMember,
  onRemoveMember,
}: ManageMembersModalProps) {
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ChatMember['role']>('player');
  const [showRolePicker, setShowRolePicker] = useState<boolean>(false);

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAdd = () => {
    const trimmedName = newName.trim();
    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Email Required', 'Please enter an email address.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter a name.');
      return;
    }
    const alreadyExists = members.some(m => m.email?.toLowerCase() === trimmedEmail);
    if (alreadyExists) {
      Alert.alert('Already Added', 'A member with this email is already in the group.');
      return;
    }
    onAddMember(trimmedName, selectedRole, trimmedEmail);
    setNewName('');
    setNewEmail('');
  };

  const handleRemove = (member: ChatMember) => {
    if (member.role === 'coach' && member.id === 'admin') {
      Alert.alert('Cannot Remove', 'You cannot remove yourself from the group.');
      return;
    }
    Alert.alert(
      'Remove Member',
      `Remove ${member.name} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onRemoveMember(member.id) },
      ]
    );
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const renderMember = ({ item }: { item: ChatMember }) => (
    <View style={styles.memberRow}>
      <View style={[styles.memberAvatar, { backgroundColor: ROLE_COLORS[item.role] + '30' }]}>
        <Text style={[styles.memberAvatarText, { color: ROLE_COLORS[item.role] }]}>
          {getInitials(item.name)}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        {item.email ? (
          <Text style={styles.memberEmail} numberOfLines={1}>{item.email}</Text>
        ) : null}
        <View style={styles.roleTagRow}>
          <View style={[styles.roleTag, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
            <Text style={[styles.roleTagText, { color: ROLE_COLORS[item.role] }]}>
              {ROLE_LABELS[item.role]}
            </Text>
          </View>
          {item.id === 'admin' && (
            <View style={styles.adminTag}>
              <Shield size={10} color={theme.colors.primary} />
              <Text style={styles.adminTagText}>Admin</Text>
            </View>
          )}
        </View>
      </View>
      {item.id !== 'admin' && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Trash2 size={18} color={theme.colors.error} />
        </TouchableOpacity>
      )}
    </View>
  );

  const coaches = members.filter(m => m.role === 'coach');
  const playersList = members.filter(m => m.role === 'player');
  const parents = members.filter(m => m.role === 'parent');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Users size={22} color={theme.colors.primary} />
              <Text style={styles.headerTitle}>Team Members</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.countRow}>
            <Text style={styles.countText}>{members.length} members</Text>
            <View style={styles.countBreakdown}>
              <Text style={[styles.countBadge, { color: ROLE_COLORS.coach }]}>
                {coaches.length} Coaches
              </Text>
              <Text style={styles.countDot}>·</Text>
              <Text style={[styles.countBadge, { color: ROLE_COLORS.player }]}>
                {playersList.length} Players
              </Text>
              <Text style={styles.countDot}>·</Text>
              <Text style={[styles.countBadge, { color: ROLE_COLORS.parent }]}>
                {parents.length} Parents
              </Text>
            </View>
          </View>

          <View style={styles.addSection}>
            <Text style={styles.addLabel}>Invite Member</Text>
            <View style={styles.addCard}>
              <View style={styles.inputRow}>
                <View style={styles.inputIcon}>
                  <Mail size={16} color={theme.colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.addInputField}
                  placeholder="Email address"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.inputDivider} />
              <View style={styles.inputRow}>
                <View style={styles.inputIcon}>
                  <User size={16} color={theme.colors.textSecondary} />
                </View>
                <TextInput
                  style={styles.addInputField}
                  placeholder="Full name"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newName}
                  onChangeText={setNewName}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
              </View>
            </View>
            <View style={styles.addActionRow}>
              <TouchableOpacity
                style={styles.rolePicker}
                onPress={() => setShowRolePicker(!showRolePicker)}
              >
                <Text style={[styles.rolePickerText, { color: ROLE_COLORS[selectedRole] }]}>
                  {ROLE_LABELS[selectedRole]}
                </Text>
                <ChevronDown size={14} color={ROLE_COLORS[selectedRole]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.addBtn,
                  (!newEmail.trim() || !newName.trim()) && styles.addBtnDisabled,
                ]}
                onPress={handleAdd}
              >
                <UserPlus size={16} color="#FFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
            {showRolePicker && (
              <View style={styles.roleOptions}>
                {(['coach', 'player', 'parent'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      selectedRole === role && { backgroundColor: ROLE_COLORS[role] + '20' },
                    ]}
                    onPress={() => {
                      setSelectedRole(role);
                      setShowRolePicker(false);
                    }}
                  >
                    <View style={[styles.roleOptionDot, { backgroundColor: ROLE_COLORS[role] }]} />
                    <Text style={[styles.roleOptionText, { color: ROLE_COLORS[role] }]}>
                      {ROLE_LABELS[role]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <FlatList
            data={members}
            keyExtractor={(item) => item.id}
            renderItem={renderMember}
            style={styles.memberList}
            contentContainerStyle={styles.memberListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  countText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  countBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  countDot: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  addSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  addLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  addCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputDivider: {
    height: 1,
    backgroundColor: theme.colors.background,
    marginLeft: 44,
  },
  addInputField: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  addActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  rolePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rolePickerText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  roleOptionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  memberList: {
    flex: 1,
  },
  memberListContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  adminTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: theme.colors.primary + '20',
  },
  adminTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
