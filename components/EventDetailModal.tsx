import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { X, Calendar, Clock, MapPin, Users, Trash2, Edit3, Play, Trophy, CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { Event, PlayerGameStats } from '@/types';
import { useApp } from '@/contexts/AppContext';

interface EventDetailModalProps {
  visible: boolean;
  event: Event | null;
  onClose: () => void;
  onUpdate: (updatedEvent: Event) => Promise<Event | void>;
}

export default function EventDetailModal({
  visible,
  event,
  onClose,
  onUpdate,
}: EventDetailModalProps) {
  const { teams, user, deleteEvent, players } = useApp();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [eventType, setEventType] = useState<'game' | 'practice' | 'tournament'>('game');
  const [title, setTitle] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [opponent, setOpponent] = useState<string>('');
  const [isHome, setIsHome] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const isAdmin = user?.role === 'coach';

  useEffect(() => {
    if (event) {
      setEventType(event.type);
      setTitle(event.title);
      setSelectedTeamId(event.teamId);
      setDate(event.date);
      setTime(event.time);
      setLocation(event.location);
      setOpponent(event.opponent || '');
      setIsHome(event.isHome || false);
    }
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }, [event]);

  const handleSave = async () => {
    if (!event || isSaving) return;

    if (!(title.trim() && selectedTeamId && date.trim() && time.trim() && location.trim())) {
      Alert.alert('Missing details', 'Please complete the title, team, date, time, and location before saving.');
      return;
    }

    const selectedTeam = teams.find((team) => team.id === selectedTeamId);
    const updatedEvent: Event = {
      ...event,
      type: eventType,
      title: title.trim(),
      teamId: selectedTeamId,
      teamName: selectedTeam?.name || event.teamName,
      date: date.trim(),
      time: time.trim(),
      location: location.trim(),
      opponent: opponent.trim() || undefined,
      isHome,
    };

    setIsSaving(true);
    try {
      const savedEvent = await onUpdate(updatedEvent);
      if (savedEvent) {
        setEventType(savedEvent.type);
        setTitle(savedEvent.title);
        setSelectedTeamId(savedEvent.teamId);
        setDate(savedEvent.date);
        setTime(savedEvent.time);
        setLocation(savedEvent.location);
        setOpponent(savedEvent.opponent || '');
        setIsHome(savedEvent.isHome || false);
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving event changes:', error);
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Unable to save event changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    
    setIsDeleting(true);
    try {
      await deleteEvent(event.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeletePress = () => {
    if (Platform.OS === 'web') {
      setShowDeleteConfirm(true);
    } else {
      Alert.alert(
        'Delete Event',
        `Are you sure you want to delete "${event?.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: handleDelete },
        ]
      );
    }
  };

  const formatDate = (dateStr: string) => {
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const dateObj = new Date('2000-01-01 ' + timeStr);
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (!event) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={[
                styles.typeBadge,
                eventType === 'game' && styles.gameBadge,
                eventType === 'practice' && styles.practiceBadge,
                eventType === 'tournament' && styles.tournamentBadge,
              ]}>
                <Text style={[
                  styles.typeBadgeText,
                  eventType === 'game' && styles.gameBadgeText,
                  eventType === 'practice' && styles.practiceBadgeText,
                  eventType === 'tournament' && styles.tournamentBadgeText,
                ]}>
                  {eventType.toUpperCase()}
                </Text>
              </View>
              {isHome && eventType === 'game' && (
                <View style={styles.homeBadge}>
                  <Text style={styles.homeBadgeText}>HOME</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.eventTitle}>{title}</Text>
          {opponent ? (
            <Text style={styles.opponentText}>vs {opponent}</Text>
          ) : null}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {!isEditing ? (
            <View style={styles.detailView}>
              <View style={styles.detailSection}>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Calendar size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Date</Text>
                      <Text style={styles.detailValue}>{formatDate(date)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailDivider} />
                  
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Clock size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Time</Text>
                      <Text style={styles.detailValue}>{formatTime(time)}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailDivider} />
                  
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <MapPin size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{location}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailDivider} />
                  
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconContainer}>
                      <Users size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Team</Text>
                      <Text style={styles.detailValue}>{event.teamName}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {eventType === 'game' && !event.gameResult && (
                <TouchableOpacity 
                  style={styles.scoreGameButton}
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: '/(tabs)/score',
                      params: {
                        teamId: event.teamId,
                        opponent: event.opponent || '',
                        eventTitle: event.title,
                        eventId: event.id,
                      },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Play size={20} color="#FFFFFF" />
                  <Text style={styles.scoreGameButtonText}>Score Game</Text>
                </TouchableOpacity>
              )}

              {event.gameResult && (
                <View style={styles.gameResultSection}>
                  <View style={styles.gameResultHeader}>
                    <CheckCircle size={20} color="#22C55E" />
                    <Text style={styles.gameResultTitle}>Game Completed</Text>
                  </View>
                  
                  <View style={styles.finalScoreCard}>
                    <View style={styles.scoreTeam}>
                      <Text style={styles.scoreTeamName}>{event.teamName}</Text>
                      <Text style={[
                        styles.scoreValue,
                        event.gameResult.homeScore > event.gameResult.awayScore && styles.winningScore
                      ]}>
                        {event.gameResult.homeScore}
                      </Text>
                    </View>
                    <Text style={styles.scoreDivider}>-</Text>
                    <View style={styles.scoreTeam}>
                      <Text style={styles.scoreTeamName}>{event.opponent || 'Opponent'}</Text>
                      <Text style={[
                        styles.scoreValue,
                        event.gameResult.awayScore > event.gameResult.homeScore && styles.winningScore
                      ]}>
                        {event.gameResult.awayScore}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultBadge}>
                    <Trophy size={16} color={event.gameResult.homeScore > event.gameResult.awayScore ? '#22C55E' : event.gameResult.homeScore < event.gameResult.awayScore ? '#EF4444' : '#F59E0B'} />
                    <Text style={[
                      styles.resultBadgeText,
                      event.gameResult.homeScore > event.gameResult.awayScore && styles.winText,
                      event.gameResult.homeScore < event.gameResult.awayScore && styles.lossText,
                      event.gameResult.homeScore === event.gameResult.awayScore && styles.tieText,
                    ]}>
                      {event.gameResult.homeScore > event.gameResult.awayScore ? 'WIN' : event.gameResult.homeScore < event.gameResult.awayScore ? 'LOSS' : 'TIE'}
                    </Text>
                  </View>

                  {Object.keys(event.gameResult.playerStats).length > 0 && (
                    <View style={styles.playerStatsSection}>
                      <Text style={styles.playerStatsTitle}>Player Stats</Text>
                      {Object.entries(event.gameResult.playerStats)
                        .filter(([, stats]) => {
                          const s = stats as PlayerGameStats;
                          return s.points > 0 || s.assists > 0 || s.offensiveRebounds + s.defensiveRebounds > 0 || s.steals > 0;
                        })
                        .map(([playerId, stats]) => {
                          const player = players.find(p => p.id === playerId);
                          const s = stats as PlayerGameStats;
                          if (!player) return null;
                          return (
                            <View key={playerId} style={styles.playerStatRow}>
                              <View style={styles.playerStatInfo}>
                                <View style={styles.playerJersey}>
                                  <Text style={styles.playerJerseyText}>{player.jerseyNumber}</Text>
                                </View>
                                <Text style={styles.playerStatName}>{player.name}</Text>
                              </View>
                              <View style={styles.playerStatValues}>
                                <View style={styles.statItem}>
                                  <Text style={styles.statNumber}>{s.points}</Text>
                                  <Text style={styles.statLabel}>PTS</Text>
                                </View>
                                <View style={styles.statItem}>
                                  <Text style={styles.statNumber}>{s.assists}</Text>
                                  <Text style={styles.statLabel}>AST</Text>
                                </View>
                                <View style={styles.statItem}>
                                  <Text style={styles.statNumber}>{s.offensiveRebounds + s.defensiveRebounds}</Text>
                                  <Text style={styles.statLabel}>REB</Text>
                                </View>
                                <View style={styles.statItem}>
                                  <Text style={styles.statNumber}>{s.steals}</Text>
                                  <Text style={styles.statLabel}>STL</Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                    </View>
                  )}
                </View>
              )}

              {isAdmin && (
                <View style={styles.adminActions}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                    activeOpacity={0.8}
                  >
                    <Edit3 size={20} color={theme.colors.text} />
                    <Text style={styles.editButtonText}>Edit Event</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={handleDeletePress}
                    activeOpacity={0.8}
                  >
                    <Trash2 size={20} color="#FF4444" />
                    <Text style={styles.deleteButtonText}>Delete Event</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.editView}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Edit Event</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Event Type</Text>
                <View style={styles.typeSelector}>
                  {(['game', 'practice', 'tournament'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeButton,
                        eventType === type && styles.typeButtonActive,
                      ]}
                      onPress={() => setEventType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          eventType === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Event Title</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter event title"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              {eventType === 'game' && (
                <>
                  <View style={styles.section}>
                    <Text style={styles.label}>Opponent (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter opponent name"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={opponent}
                      onChangeText={setOpponent}
                    />
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.label}>Game Location</Text>
                    <View style={styles.typeSelector}>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          isHome && styles.typeButtonActive,
                        ]}
                        onPress={() => setIsHome(true)}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            isHome && styles.typeButtonTextActive,
                          ]}
                        >
                          Home
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeButton,
                          !isHome && styles.typeButtonActive,
                        ]}
                        onPress={() => setIsHome(false)}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            !isHome && styles.typeButtonTextActive,
                          ]}
                        >
                          Away
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}

              <View style={styles.section}>
                <Text style={styles.label}>Team</Text>
                <View style={styles.teamSelector}>
                  {teams.map((team) => (
                    <TouchableOpacity
                      key={team.id}
                      style={[
                        styles.teamButton,
                        selectedTeamId === team.id && styles.teamButtonActive,
                      ]}
                      onPress={() => setSelectedTeamId(team.id)}
                    >
                      <Text
                        style={[
                          styles.teamButtonText,
                          selectedTeamId === team.id && styles.teamButtonTextActive,
                        ]}
                      >
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={date}
                  onChangeText={setDate}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Time</Text>
                <TextInput
                  style={styles.input}
                  placeholder="HH:MM AM/PM"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={time}
                  onChangeText={setTime}
                />
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter location"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setIsEditing(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={() => {
                    void handleSave();
                  }}
                  activeOpacity={0.8}
                  disabled={isSaving}
                >
                  <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>

        {showDeleteConfirm && (
          <Modal
            visible={showDeleteConfirm}
            transparent
            animationType="fade"
            onRequestClose={() => setShowDeleteConfirm(false)}
          >
            <View style={styles.confirmOverlay}>
              <View style={styles.confirmModal}>
                <View style={styles.confirmIconContainer}>
                  <Trash2 size={32} color="#FF4444" />
                </View>
                <Text style={styles.confirmTitle}>Delete Event</Text>
                <Text style={styles.confirmMessage}>
                  {`Are you sure you want to delete "${event?.title}"? This action cannot be undone.`}
                </Text>
                <View style={styles.confirmActions}>
                  <TouchableOpacity 
                    style={styles.confirmCancelButton}
                    onPress={() => setShowDeleteConfirm(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.confirmDeleteButton}
                    onPress={handleDelete}
                    activeOpacity={0.8}
                    disabled={isDeleting}
                  >
                    <Text style={styles.confirmDeleteText}>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    ...Platform.select({
      ios: {
        paddingTop: 60,
      },
      android: {
        paddingTop: theme.spacing.lg,
      },
      web: {
        paddingTop: theme.spacing.lg,
      },
    }),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  gameBadge: {
    backgroundColor: 'rgba(255, 105, 0, 0.2)',
  },
  practiceBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
  },
  tournamentBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  typeBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700' as const,
  },
  gameBadgeText: {
    color: theme.colors.primary,
  },
  practiceBadgeText: {
    color: '#3B82F6',
  },
  tournamentBadgeText: {
    color: '#8B5CF6',
  },
  homeBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  homeBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700' as const,
    color: '#22C55E',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  opponentText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '500' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  detailView: {
    padding: theme.spacing.lg,
  },
  detailSection: {
    marginBottom: theme.spacing.xl,
  },
  detailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  detailIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 105, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  detailDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  scoreGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  scoreGameButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  adminActions: {
    gap: theme.spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  editButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  deleteButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: '#FF4444',
  },
  gameResultSection: {
    marginBottom: theme.spacing.xl,
  },
  gameResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  gameResultTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: '#22C55E',
  },
  finalScoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  scoreTeam: {
    alignItems: 'center',
    flex: 1,
  },
  scoreTeamName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  winningScore: {
    color: '#22C55E',
  },
  scoreDivider: {
    fontSize: 24,
    color: theme.colors.textSecondary,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
  },
  resultBadgeText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
  },
  winText: {
    color: '#22C55E',
  },
  lossText: {
    color: '#EF4444',
  },
  tieText: {
    color: '#F59E0B',
  },
  playerStatsSection: {
    marginTop: theme.spacing.lg,
  },
  playerStatsTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  playerStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  playerStatInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    flex: 1,
  },
  playerJersey: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerJerseyText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  playerStatName: {
    fontSize: theme.fontSize.md,
    fontWeight: '500' as const,
    color: theme.colors.text,
  },
  playerStatValues: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  },
  editView: {
    paddingBottom: theme.spacing.xl,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase' as const,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'rgba(255, 105, 0, 0.15)',
    borderColor: theme.colors.primary,
  },
  typeButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    textTransform: 'capitalize' as const,
  },
  typeButtonTextActive: {
    color: theme.colors.primary,
  },
  teamSelector: {
    gap: theme.spacing.sm,
  },
  teamButton: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  teamButtonActive: {
    backgroundColor: 'rgba(255, 105, 0, 0.15)',
    borderColor: theme.colors.primary,
  },
  teamButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  teamButtonTextActive: {
    color: theme.colors.primary,
  },
  editActions: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  confirmModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  confirmIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  confirmTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  confirmMessage: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 22,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
