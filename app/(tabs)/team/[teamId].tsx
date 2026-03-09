import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { theme } from '@/constants/theme';
import { Calendar, MapPin, Mail, CheckCircle, Clock, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import AddPlayerModal from '@/components/AddPlayerModal';
import PlayerDetailModal from '@/components/PlayerDetailModal';
import AddEventModal from '@/components/AddEventModal';
import AddFanModal from '@/components/AddFanModal';
import EventDetailModal from '@/components/EventDetailModal';
import { Player, Event } from '@/types';
import uuid from 'react-native-uuid';

export default function TeamScreen() {
  const { teamId } = useLocalSearchParams();
  const { teams, players, fans = [], addPlayer, updatePlayer, addEvent, deleteTeam } = useApp();
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState<'roster' | 'stats' | 'events' | 'fans'>('roster');
  const [statsView, setStatsView] = useState<'season' | 'career'>('season');
  const [isAddPlayerModalVisible, setIsAddPlayerModalVisible] = useState<boolean>(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isPlayerDetailModalVisible, setIsPlayerDetailModalVisible] = useState<boolean>(false);
  const [isAddEventModalVisible, setIsAddEventModalVisible] = useState<boolean>(false);
  const [isAddFanModalVisible, setIsAddFanModalVisible] = useState<boolean>(false);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventDetailModalVisible, setIsEventDetailModalVisible] = useState<boolean>(false);

  const team = teams.find((t) => t.id === teamId);
  const teamPlayers = players.filter((p) => p.teamId === teamId);
  const { events } = useApp();
  const teamEvents = events.filter((e) => e.teamId === teamId).sort((a, b) => {
    const dateA = new Date(a.date + ' ' + a.time);
    const dateB = new Date(b.date + ' ' + b.time);
    return dateB.getTime() - dateA.getTime();
  });
  const teamFans = fans.filter((f) => f.teamId === teamId);

  if (!team) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Team not found</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: team.name,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
        }} 
      />
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <Text style={styles.teamName}>{team.name}</Text>
                <Text style={styles.record}>{team.record}</Text>
                <Text style={styles.season}>2024-2025 Season</Text>
              </View>
              <TouchableOpacity 
                style={styles.addEventButton}
                onPress={() => setIsAddEventModalVisible(true)}
              >
                <Text style={styles.addEventButtonText}>+ Add Event</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabContainer}
            contentContainerStyle={styles.tabContentContainer}
          >
            <TouchableOpacity 
              style={styles.tab}
              onPress={() => setSelectedTab('roster')}
            >
              <Text style={[styles.tabText, selectedTab === 'roster' && styles.tabTextActive]}>Roster</Text>
              {selectedTab === 'roster' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tab}
              onPress={() => setSelectedTab('stats')}
            >
              <Text style={[styles.tabText, selectedTab === 'stats' && styles.tabTextActive]}>Stats</Text>
              {selectedTab === 'stats' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tab}
              onPress={() => setSelectedTab('events')}
            >
              <Text style={[styles.tabText, selectedTab === 'events' && styles.tabTextActive]}>Events</Text>
              {selectedTab === 'events' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.tab}
              onPress={() => setSelectedTab('fans')}
            >
              <Text style={[styles.tabText, selectedTab === 'fans' && styles.tabTextActive]}>Fans</Text>
              {selectedTab === 'fans' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.section}>
            {selectedTab === 'roster' ? (
              <>
                <View style={styles.sectionHeader}>
                  <TouchableOpacity 
                    style={styles.addPlayerButton}
                    onPress={() => setIsAddPlayerModalVisible(true)}
                  >
                    <Text style={styles.addPlayerButtonText}>+ Add Player</Text>
                  </TouchableOpacity>
                </View>

                {teamPlayers.map((player) => (
                  <TouchableOpacity 
                    key={player.id} 
                    style={styles.playerCard}
                    onPress={() => {
                      setSelectedPlayer(player);
                      setIsPlayerDetailModalVisible(true);
                    }}
                  >
                    <View style={styles.playerAvatar}>
                      <Text style={styles.playerAvatarText}>{player.name.charAt(0)}</Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerDetails}>
                        #{player.jerseyNumber}{player.position ? ` · ${player.position}` : ''}
                      </Text>
                    </View>
                    <View style={styles.playerStats}>
                      <Text style={styles.playerStatValue}>{player.stats.points.toFixed(1)}</Text>
                      <Text style={styles.playerStatLabel}>PTS</Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {teamPlayers.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No players added yet</Text>
                    <Text style={styles.emptySubtext}>Tap + Add Player to get started</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.deleteTeamButton}
                  onPress={() => setIsDeleteConfirmVisible(true)}
                >
                  <Trash2 size={20} color="#EF4444" />
                  <Text style={styles.deleteTeamButtonText}>Delete Team</Text>
                </TouchableOpacity>
              </>
            ) : selectedTab === 'stats' ? (
              <>
                {teamPlayers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No player stats yet</Text>
                    <Text style={styles.emptySubtext}>Add players to see team statistics</Text>
                  </View>
                ) : (
                  <View style={styles.statsContainer}>
                    <View style={styles.statsToggleContainer}>
                      <TouchableOpacity
                        style={[styles.statsToggleButton, statsView === 'season' && styles.statsToggleButtonActive]}
                        onPress={() => setStatsView('season')}
                      >
                        <Text style={[styles.statsToggleText, statsView === 'season' && styles.statsToggleTextActive]}>Season</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.statsToggleButton, statsView === 'career' && styles.statsToggleButtonActive]}
                        onPress={() => setStatsView('career')}
                      >
                        <Text style={[styles.statsToggleText, statsView === 'career' && styles.statsToggleTextActive]}>Career</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {teamPlayers.map((player) => {
                      const gamesPlayed = player.stats.gamesPlayed || 0;
                      const divisor = gamesPlayed > 0 ? gamesPlayed : 1;
                      const ppg = player.stats.points / divisor;
                      const apg = player.stats.assists / divisor;
                      const rpg = player.stats.rebounds / divisor;
                      const spg = player.stats.steals / divisor;
                      const bpg = player.stats.blocks / divisor;
                      const tpg = player.stats.turnovers / divisor;
                      const fgPct = player.stats.fieldGoalsAttempted > 0 
                        ? (player.stats.fieldGoalsMade / player.stats.fieldGoalsAttempted * 100) 
                        : 0;
                      const threePct = player.stats.threePointersAttempted > 0 
                        ? (player.stats.threePointersMade / player.stats.threePointersAttempted * 100) 
                        : 0;
                      const ftPct = player.stats.freeThrowsAttempted > 0 
                        ? (player.stats.freeThrowsMade / player.stats.freeThrowsAttempted * 100) 
                        : 0;

                      return (
                        <TouchableOpacity
                          key={player.id}
                          style={styles.playerStatsCard}
                          onPress={() => {
                            setSelectedPlayer(player);
                            setIsPlayerDetailModalVisible(true);
                          }}
                        >
                          <View style={styles.playerStatsHeader}>
                            <View style={styles.statsPlayerAvatar}>
                              <Text style={styles.statsPlayerAvatarText}>
                                {player.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={styles.playerStatsNameSection}>
                              <Text style={styles.playerStatsName}>{player.name}</Text>
                              <Text style={styles.playerStatsInfo}>#{player.jerseyNumber}{player.position ? ` · ${player.position}` : ''}</Text>
                            </View>
                            <View style={styles.playerGamesPlayed}>
                              <Text style={styles.playerGamesPlayedValue}>{gamesPlayed}</Text>
                              <Text style={styles.playerGamesPlayedLabel}>GP</Text>
                            </View>
                          </View>
                          
                          <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            style={styles.statsScrollView}
                            contentContainerStyle={styles.statsScrollContent}
                          >
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{ppg.toFixed(1)}</Text>
                              <Text style={styles.statBoxLabel}>PPG</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{apg.toFixed(1)}</Text>
                              <Text style={styles.statBoxLabel}>APG</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{rpg.toFixed(1)}</Text>
                              <Text style={styles.statBoxLabel}>RPG</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{bpg.toFixed(1)}</Text>
                              <Text style={styles.statBoxLabel}>BPG</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{spg.toFixed(1)}</Text>
                              <Text style={styles.statBoxLabel}>SPG</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{tpg.toFixed(1)}</Text>
                              <Text style={styles.statBoxLabel}>TOV</Text>
                            </View>
                            <View style={styles.statBoxDivider} />
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{fgPct.toFixed(0)}%</Text>
                              <Text style={styles.statBoxLabel}>FG%</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{threePct.toFixed(0)}%</Text>
                              <Text style={styles.statBoxLabel}>3P%</Text>
                            </View>
                            <View style={styles.statBox}>
                              <Text style={styles.statBoxValue}>{ftPct.toFixed(0)}%</Text>
                              <Text style={styles.statBoxLabel}>FT%</Text>
                            </View>
                          </ScrollView>
                          
                          {statsView === 'career' && (
                            <View style={styles.careerTotalsContainer}>
                              <Text style={styles.careerTotalsTitle}>Career Totals</Text>
                              <View style={styles.careerTotalsRow}>
                                <View style={styles.careerTotalItem}>
                                  <Text style={styles.careerTotalValue}>{player.stats.points}</Text>
                                  <Text style={styles.careerTotalLabel}>PTS</Text>
                                </View>
                                <View style={styles.careerTotalItem}>
                                  <Text style={styles.careerTotalValue}>{player.stats.assists}</Text>
                                  <Text style={styles.careerTotalLabel}>AST</Text>
                                </View>
                                <View style={styles.careerTotalItem}>
                                  <Text style={styles.careerTotalValue}>{player.stats.rebounds}</Text>
                                  <Text style={styles.careerTotalLabel}>REB</Text>
                                </View>
                                <View style={styles.careerTotalItem}>
                                  <Text style={styles.careerTotalValue}>{player.stats.blocks}</Text>
                                  <Text style={styles.careerTotalLabel}>BLK</Text>
                                </View>
                                <View style={styles.careerTotalItem}>
                                  <Text style={styles.careerTotalValue}>{player.stats.steals}</Text>
                                  <Text style={styles.careerTotalLabel}>STL</Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            ) : selectedTab === 'fans' ? (
              <>
                <View style={styles.sectionHeader}>
                  <TouchableOpacity onPress={() => setIsAddFanModalVisible(true)}>
                    <Text style={styles.addButton}>+ Invite Fan</Text>
                  </TouchableOpacity>
                </View>

                {teamFans.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Mail size={32} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyText}>No fans yet</Text>
                    <Text style={styles.emptySubtext}>Invite parents to join the team</Text>
                  </View>
                ) : (
                  teamFans.map((fan) => (
                    <View key={fan.id} style={styles.fanCard}>
                      <View style={styles.fanAvatar}>
                        <Text style={styles.fanAvatarText}>{fan.name.split(' ').map(n => n[0]).join('')}</Text>
                      </View>
                      <View style={styles.fanInfo}>
                        <Text style={styles.fanName}>{fan.name}</Text>
                        <Text style={styles.fanPlayer}>{fan.playerName || 'No player linked'}</Text>
                      </View>
                      <View style={[styles.statusBadge, fan.status === 'active' ? styles.activeBadge : styles.invitedBadge]}>
                        {fan.status === 'active' ? (
                          <CheckCircle size={14} color={theme.colors.success} />
                        ) : (
                          <Clock size={14} color={theme.colors.textSecondary} />
                        )}
                        <Text style={[styles.statusText, fan.status === 'active' ? styles.activeText : styles.invitedText]}>
                          {fan.status === 'active' ? 'Active' : 'Invited'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </>
            ) : (
              <>
                {teamEvents.map((event) => (
                  <TouchableOpacity 
                    key={event.id} 
                    style={styles.eventCard}
                    onPress={() => {
                      setSelectedEvent(event);
                      setIsEventDetailModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.eventHeader}>
                      <View style={[styles.eventTypeBadge, event.type === 'game' ? styles.gameBadge : styles.practiceBadge]}>
                        <Text style={styles.eventTypeText}>{event.type === 'game' ? 'GAME' : 'PRACTICE'}</Text>
                      </View>
                      {event.isHome !== undefined && (
                        <Text style={styles.homeAwayText}>{event.isHome ? 'HOME' : 'AWAY'}</Text>
                      )}
                    </View>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.eventDetails}>
                      <View style={styles.eventDetailRow}>
                        <Calendar size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.eventDetailText}>
                          {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {event.time}
                        </Text>
                      </View>
                      <View style={styles.eventDetailRow}>
                        <MapPin size={14} color={theme.colors.textSecondary} />
                        <Text style={styles.eventDetailText}>{event.location}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                {teamEvents.length === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No events scheduled</Text>
                    <Text style={styles.emptySubtext}>Add events from the home screen</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        <AddPlayerModal
          visible={isAddPlayerModalVisible}
          onClose={() => setIsAddPlayerModalVisible(false)}
          onSave={(playerData) => {
            const newPlayer: Player = {
              id: uuid.v4() as string,
              name: playerData.name,
              jerseyNumber: playerData.jerseyNumber,
              position: playerData.position,
              teamId: teamId as string,
              stats: {
                gamesPlayed: 0,
                points: 0,
                assists: 0,
                rebounds: 0,
                offensiveRebounds: 0,
                defensiveRebounds: 0,
                steals: 0,
                blocks: 0,
                turnovers: 0,
                fouls: 0,
                fieldGoalsMade: 0,
                fieldGoalsAttempted: 0,
                threePointersMade: 0,
                threePointersAttempted: 0,
                freeThrowsMade: 0,
                freeThrowsAttempted: 0,
              },
            };
            void addPlayer(newPlayer);
            setIsAddPlayerModalVisible(false);
          }}
        />

        <PlayerDetailModal
          visible={isPlayerDetailModalVisible}
          player={selectedPlayer}
          onClose={() => {
            setIsPlayerDetailModalVisible(false);
            setSelectedPlayer(null);
          }}
          onSave={async (updatedPlayer) => {
            try {
              await updatePlayer(updatedPlayer);
              console.log('Player updated successfully:', updatedPlayer.name);
              setIsPlayerDetailModalVisible(false);
              setSelectedPlayer(null);
            } catch (error) {
              console.error('Error updating player:', error);
              alert('Failed to save player changes. Please try again.');
            }
          }}
        />

        <AddEventModal
          visible={isAddEventModalVisible}
          onClose={() => setIsAddEventModalVisible(false)}
          onSave={(eventData) => {
            const newEvent: Event = {
              id: uuid.v4() as string,
              type: eventData.type,
              title: eventData.title,
              teamId: eventData.teamId,
              teamName: eventData.teamName,
              date: eventData.date,
              time: eventData.time,
              location: eventData.location,
              opponent: eventData.opponent,
            };
            addEvent(newEvent);
            setIsAddEventModalVisible(false);
          }}
        />

        <AddFanModal
          visible={isAddFanModalVisible}
          onClose={() => setIsAddFanModalVisible(false)}
          teamId={teamId as string}
        />

        <EventDetailModal
          visible={isEventDetailModalVisible}
          event={selectedEvent}
          onClose={() => {
            setIsEventDetailModalVisible(false);
            setSelectedEvent(null);
          }}
          onUpdate={() => {}}
        />

        <Modal
          visible={isDeleteConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsDeleteConfirmVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModal}>
              <View style={styles.deleteIconContainer}>
                <Trash2 size={32} color="#EF4444" />
              </View>
              <Text style={styles.deleteTitle}>Delete Team</Text>
              <Text style={styles.deleteMessage}>
                {`Are you sure you want to delete "${team.name}"? This will also delete all players, events, and fans associated with this team.`}
              </Text>
              <Text style={styles.deleteWarning}>This action cannot be undone.</Text>
              <View style={styles.deleteActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setIsDeleteConfirmVisible(false)}
                  disabled={isDeleting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  onPress={async () => {
                    setIsDeleting(true);
                    try {
                      await deleteTeam(teamId as string);
                      setIsDeleteConfirmVisible(false);
                      router.back();
                    } catch (error) {
                      console.error('Error deleting team:', error);
                      alert('Failed to delete team');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  teamName: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  record: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  season: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  addEventButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    marginTop: 4,
  },
  addEventButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  playerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  statItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  shootingStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
  },
  addButton: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.primary,
  },
  addPlayerButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  addPlayerButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  playerAvatarText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  playerDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  playerStats: {
    alignItems: 'center',
  },
  playerStatValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.primary,
  },
  playerStatLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  tabContainer: {
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surface,
  },
  tabContentContainer: {
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.xl,
  },
  tab: {
    paddingVertical: theme.spacing.md,
    position: 'relative' as const,
  },
  tabText: {
    fontSize: 18,
    fontWeight: '400' as const,
    color: theme.colors.textSecondary,
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '400' as const,
  },
  tabIndicator: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#007AFF',
  },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  eventTypeBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  gameBadge: {
    backgroundColor: theme.colors.primary + '20',
  },
  practiceBadge: {
    backgroundColor: theme.colors.textSecondary + '20',
  },
  eventTypeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  homeAwayText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  eventTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  eventDetails: {
    gap: theme.spacing.xs,
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  eventDetailText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  fanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  fanAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fanAvatarText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  fanInfo: {
    flex: 1,
  },
  fanName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  fanPlayer: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  activeBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  invitedBadge: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
  },
  activeText: {
    color: theme.colors.success,
  },
  invitedText: {
    color: theme.colors.textSecondary,
  },
  deleteTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  deleteTeamButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  deleteModal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  deleteTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  deleteMessage: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: theme.spacing.sm,
  },
  deleteWarning: {
    fontSize: theme.fontSize.xs,
    color: '#EF4444',
    fontWeight: '600' as const,
    marginBottom: theme.spacing.lg,
  },
  deleteActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: '#fff',
  },
  statsContainer: {
    flex: 1,
  },
  statsToggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
    marginBottom: theme.spacing.lg,
  },
  statsToggleButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
  },
  statsToggleButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  statsToggleText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  statsToggleTextActive: {
    color: theme.colors.text,
  },
  playerStatsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  playerStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  statsPlayerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E67E22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  statsPlayerAvatarText: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  playerStatsNameSection: {
    flex: 1,
  },
  playerStatsName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: 2,
  },
  playerStatsInfo: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  playerGamesPlayed: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  playerGamesPlayedValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  playerGamesPlayedLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  statsScrollView: {
    marginHorizontal: -theme.spacing.md,
  },
  statsScrollContent: {
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    minWidth: 60,
  },
  statBoxValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '700' as const,
    color: '#E67E22',
  },
  statBoxLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statBoxDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.xs,
  },
  careerTotalsContainer: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  careerTotalsTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  careerTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  careerTotalItem: {
    alignItems: 'center',
  },
  careerTotalValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  careerTotalLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
});
