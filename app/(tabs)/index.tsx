import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { theme } from '@/constants/theme';

import AddTeamModal from '@/components/AddTeamModal';
import AddEventModal from '@/components/AddEventModal';
import SettingsModal from '@/components/SettingsModal';
import EventDetailModal from '@/components/EventDetailModal';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Event, Team, Player } from '@/types';
import uuid from 'react-native-uuid';

export default function HomeScreen() {
  const { user, teams = [], events = [], addTeam, addEvent, addPlayer, updateEvent } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [showAddTeamModal, setShowAddTeamModal] = useState<boolean>(false);
  const [showAddEventModal, setShowAddEventModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventDetailModal, setShowEventDetailModal] = useState<boolean>(false);

  const parseDateTime = (dateStr: string, timeStr: string) => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      const timeMatch = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const minutes = timeMatch[2];
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === 'PM' && hours !== 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        return new Date(`${isoDate}T${hours.toString().padStart(2, '0')}:${minutes}:00`);
      }
      return new Date(`${isoDate}T00:00:00`);
    }
    const direct = new Date(dateStr + 'T' + timeStr);
    if (!isNaN(direct.getTime())) return direct;
    return new Date(dateStr);
  };

  const upcomingEvents = (events || [])
    .sort((a, b) => parseDateTime(a.date, a.time).getTime() - parseDateTime(b.date, b.time).getTime())
    .slice(0, 3);

  const formatDate = (dateStr: string, timeStr: string) => {
    const date = parseDateTime(dateStr, timeStr);
    if (isNaN(date.getTime())) return 'Unknown Date';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + 
           date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const handleSaveTeam = async (teamData: {
    name: string;
    members: { id: string; name: string; jerseyNumber: string; position: string }[];
  }) => {
    const teamId = uuid.v4() as string;
    
    const newTeam: Team = {
      id: teamId,
      name: teamData.name,
      record: '0-0',
      playerCount: teamData.members.length,
      avgPPG: 0,
    };
    
    try {
      await addTeam(newTeam);
      
      for (const member of teamData.members) {
        const newPlayer: Player = {
          id: uuid.v4() as string,
          name: member.name,
          jerseyNumber: member.jerseyNumber,
          position: member.position,
          teamId: teamId,
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
        await addPlayer(newPlayer);
      }
    } catch (error) {
      console.error('Error creating team with players:', error);
    }
  };

  const handleSaveEvent = (eventData: {
    type: 'game' | 'practice' | 'tournament';
    title: string;
    teamId: string;
    teamName: string;
    date: string;
    time: string;
    location: string;
    opponent?: string;
  }) => {
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
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    setShowEventDetailModal(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{user?.fullName || 'Coach'}</Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettingsModal(true)}>
            <Settings size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Teams</Text>
            <TouchableOpacity style={styles.addButtonContainer} onPress={() => setShowAddTeamModal(true)}>
              <Text style={styles.addButtonText}>+ Add Team</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.teamsGrid}>
            {teams.map((team) => (
              <View key={team.id} style={styles.teamCard}>
                <TouchableOpacity
                  style={styles.teamCardInner}
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(tabs)/team/${team.id}`)}
                >
                  <Text style={styles.teamCardName}>{team.name}</Text>
                  <Text style={styles.teamCardRecord}>{team.record}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            <TouchableOpacity style={styles.addButtonContainer} onPress={() => setShowAddEventModal(true)}>
              <Text style={styles.addButtonText}>+ Add Event</Text>
            </TouchableOpacity>
          </View>

          {upcomingEvents.map((event) => (
            <TouchableOpacity 
              key={event.id} 
              style={styles.eventCard}
              onPress={() => handleEventPress(event)}
              activeOpacity={0.7}
            >
              <View style={styles.eventBadge}>
                <Text style={[styles.eventBadgeText, event.type === 'game' ? styles.gameBadge : styles.practiceBadge]}>
                  {event.type}
                </Text>
              </View>
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventTime}>{formatDate(event.date, event.time)}</Text>
              <Text style={styles.eventLocation}>{event.location}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Results</Text>
          <View style={styles.resultCard}>
            <View>
              <Text style={styles.resultOpponent}>vs Central Warriors</Text>
              <Text style={styles.resultDate}>Oct 31</Text>
            </View>
            <Text style={styles.resultScore}>78-65</Text>
          </View>
        </View>
      </ScrollView>

      <AddTeamModal
        visible={showAddTeamModal}
        onClose={() => setShowAddTeamModal(false)}
        onSave={handleSaveTeam}
      />

      <AddEventModal
        visible={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onSave={handleSaveEvent}
      />

      <SettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <EventDetailModal
        visible={showEventDetailModal}
        event={selectedEvent}
        onClose={() => setShowEventDetailModal(false)}
        onUpdate={async (updatedEvent) => {
          const savedEvent = await updateEvent(updatedEvent);
          setSelectedEvent(savedEvent);
          return savedEvent;
        }}
      />
    </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  username: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  settingsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -theme.spacing.sm,
  },
  teamCard: {
    width: '50%',
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  teamCardInner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  teamCardName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  teamCardRecord: {
    fontSize: theme.fontSize.xxxl,
    fontWeight: '700' as const,
    color: theme.colors.primary,
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
    color: '#007efb',
    marginBottom: theme.spacing.md,
  },
  addButtonContainer: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  addButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },

  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  eventBadge: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  eventBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  gameBadge: {
    backgroundColor: 'rgba(255, 105, 0, 0.2)',
    color: theme.colors.primary,
  },
  practiceBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3B82F6',
  },
  eventTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  eventTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  eventLocation: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  resultCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultOpponent: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  resultDate: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  resultScore: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700' as const,
    color: theme.colors.success,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
  },
  emptyStateText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
});
