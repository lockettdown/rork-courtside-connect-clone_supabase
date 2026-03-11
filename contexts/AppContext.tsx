import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Event, Fan, Game, Message, Play, Player, Team, User } from '@/types';
import { MOCK_MESSAGES } from '@/constants/mockData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import uuid from 'react-native-uuid';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ensureUuid = (value?: string): string => {
  if (value && UUID_REGEX.test(value)) {
    return value;
  }

  return uuid.v4() as string;
};

const isUuid = (value?: string): value is string => {
  return typeof value === 'string' && UUID_REGEX.test(value);
};

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>;
    const message = errorRecord.message;
    const details = errorRecord.details;
    const hint = errorRecord.hint;

    if (typeof message === 'string' && message.trim().length > 0) {
      const extraParts = [details, hint].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
      return extraParts.length > 0 ? `${message} (${extraParts.join(' • ')})` : message;
    }

    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const formatEventCreationError = (error: unknown): string => {
  const message = getErrorMessage(error, 'Unable to add event. Please try again.');

  if (message.includes('invalid input syntax for type uuid')) {
    return 'Unable to add event because the event ID was invalid. Please try again.';
  }

  return message;
};

export const [AppProvider, useApp] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [messages] = useState<Message[]>(MOCK_MESSAGES);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    
    if (!isSupabaseConfigured) {
      console.log('Supabase not configured - running in demo mode');
      setAuthLoading(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      console.log('Session fetch timeout - continuing without session');
      if (isMounted) {
        setAuthLoading(false);
      }
    }, 5000);

    const initAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        clearTimeout(timeoutId);
        if (error) {
          console.warn('Error getting session:', error.message);
          if (isMounted) {
            setAuthLoading(false);
          }
          return;
        }
        if (isMounted) {
          setSession(currentSession);
          if (currentSession?.user) {
            setUser({
              id: currentSession.user.id,
              fullName: currentSession.user.user_metadata?.full_name || currentSession.user.email?.split('@')[0] || 'User',
              email: currentSession.user.email || '',
              role: 'coach',
            });
          }
          setAuthLoading(false);
        }
      } catch (error: unknown) {
        clearTimeout(timeoutId);
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('Failed')) {
          console.warn('Network error during auth init - continuing without session:', errMsg);
        } else {
          console.error('Error getting session:', error);
        }
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    };

    void initAuth();

    try {
      const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        if (newSession?.user) {
          setUser({
            id: newSession.user.id,
            fullName: newSession.user.user_metadata?.full_name || newSession.user.email?.split('@')[0] || 'User',
            email: newSession.user.email || '',
            role: 'coach',
          });
          void queryClient.invalidateQueries({ queryKey: ['teams'] });
          void queryClient.invalidateQueries({ queryKey: ['players'] });
          void queryClient.invalidateQueries({ queryKey: ['events'] });
          void queryClient.invalidateQueries({ queryKey: ['games'] });
          void queryClient.invalidateQueries({ queryKey: ['plays'] });
          void queryClient.invalidateQueries({ queryKey: ['fans'] });
        } else {
          setUser(null);
        }
      });
      subscription = data.subscription;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('Failed')) {
        console.warn('Network error setting up auth listener - continuing in offline mode:', errMsg);
      } else {
        console.error('Error setting up auth listener:', error);
      }
      if (isMounted) {
        setAuthLoading(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [queryClient]);

  const teamsQuery = useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return [];
      console.log('Fetching teams for user:', user.id);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching teams:', JSON.stringify(error, null, 2));
        if (error.code === 'PGRST205') {
          console.log('Teams table not found - returning empty array');
          return [];
        }
        throw error;
      }
      console.log('Fetched teams:', data);
      return data.map(t => ({
        id: t.id,
        name: t.name,
        record: t.record,
        playerCount: t.player_count,
        avgPPG: t.avg_ppg,
      })) as Team[];
    },
    enabled: !!user?.id && isSupabaseConfigured,
    retry: false,
  });

  const playersQuery = useQuery({
    queryKey: ['players', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return [];
      console.log('Fetching players for user:', user.id);
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching players:', JSON.stringify(error, null, 2));
        if (error.code === 'PGRST205') {
          console.log('Players table not found - returning empty array');
          return [];
        }
        throw error;
      }
      console.log('Fetched players:', data);
      return data.map(p => ({
        id: p.id,
        name: p.name,
        jerseyNumber: p.jersey_number,
        position: p.position,
        teamId: p.team_id,
        stats: {
          gamesPlayed: p.games_played || 0,
          points: p.points,
          assists: p.assists,
          rebounds: p.rebounds,
          offensiveRebounds: p.offensive_rebounds,
          defensiveRebounds: p.defensive_rebounds,
          steals: p.steals,
          blocks: p.blocks,
          turnovers: p.turnovers,
          fouls: p.fouls,
          fieldGoalsMade: p.field_goals_made || 0,
          fieldGoalsAttempted: p.field_goals_attempted || 0,
          threePointersMade: p.three_pointers_made || 0,
          threePointersAttempted: p.three_pointers_attempted || 0,
          freeThrowsMade: p.free_throws_made || 0,
          freeThrowsAttempted: p.free_throws_attempted || 0,
        },
      })) as Player[];
    },
    enabled: !!user?.id && isSupabaseConfigured,
    retry: false,
  });

  const eventsQuery = useQuery({
    queryKey: ['events', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return [];
      console.log('Fetching events for user:', user.id);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching events:', JSON.stringify(error, null, 2));
        if (error.code === 'PGRST205') {
          console.log('Events table not found - returning empty array');
          return [];
        }
        throw error;
      }
      console.log('Fetched events:', data);
      return data.map(e => ({
        id: e.id,
        type: e.type,
        title: e.title,
        opponent: e.opponent,
        teamId: e.team_id,
        teamName: e.team_name,
        date: e.date,
        time: e.time,
        location: e.location,
        isHome: e.is_home,
        gameResult: e.game_result,
      })) as Event[];
    },
    enabled: !!user?.id && isSupabaseConfigured,
    retry: false,
  });

  const gamesQuery = useQuery({
    queryKey: ['games', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching games:', JSON.stringify(error, null, 2));
        if (error.code === 'PGRST205') {
          console.log('Games table not found - returning empty array');
          return [];
        }
        throw error;
      }
      return data.map(g => ({
        id: g.id,
        homeTeamId: g.home_team_id,
        awayTeamId: g.away_team_id,
        homeScore: g.home_score,
        awayScore: g.away_score,
        quarter: g.quarter,
        date: g.date,
        location: g.location,
        playerGameStats: g.player_game_stats || {},
        onCourt: g.on_court || [],
        events: g.events || [],
      })) as Game[];
    },
    enabled: !!user?.id && isSupabaseConfigured,
    retry: false,
  });

  const playsQuery = useQuery({
    queryKey: ['plays', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('plays')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching plays:', JSON.stringify(error, null, 2));
        if (error.code === 'PGRST205') {
          console.log('Plays table not found - returning empty array');
          return [];
        }
        throw error;
      }
      return data.map(p => ({
        id: p.id,
        name: p.name,
        drawing: p.drawing,
        createdAt: p.created_at,
      })) as Play[];
    },
    enabled: !!user?.id && isSupabaseConfigured,
    retry: false,
  });

  const fansQuery = useQuery({
    queryKey: ['fans', user?.id],
    queryFn: async () => {
      if (!user?.id || !isSupabaseConfigured) return [];
      const { data, error } = await supabase
        .from('fans')
        .select('*')
        .eq('user_id', user.id)
        .order('invited_at', { ascending: false });
      if (error) {
        console.error('Error fetching fans:', JSON.stringify(error, null, 2));
        if (error.code === 'PGRST205') {
          console.log('Fans table not found - returning empty array');
          return [];
        }
        throw error;
      }
      return data.map(f => ({
        id: f.id,
        name: f.name,
        email: f.email,
        teamId: f.team_id,
        playerId: f.player_id,
        playerName: f.player_name,
        status: f.status,
        invitedAt: f.invited_at,
        joinedAt: f.joined_at,
      })) as Fan[];
    },
    enabled: !!user?.id && isSupabaseConfigured,
    retry: false,
  });

  const teams = useMemo<Team[]>(() => teamsQuery.data ?? [], [teamsQuery.data]);
  const players = useMemo<Player[]>(() => playersQuery.data ?? [], [playersQuery.data]);
  const events = useMemo<Event[]>(() => eventsQuery.data ?? [], [eventsQuery.data]);
  const games = useMemo<Game[]>(() => gamesQuery.data ?? [], [gamesQuery.data]);
  const plays = useMemo<Play[]>(() => playsQuery.data ?? [], [playsQuery.data]);
  const fans = useMemo<Fan[]>(() => fansQuery.data ?? [], [fansQuery.data]);

  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].id);
    }
  }, [teams, selectedTeamId]);

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('Login error:', error.message);
      throw error;
    }
    return data;
  }, []);

  const signup = useCallback(async (fullName: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: undefined,
      },
    });
    if (error) {
      console.error('Signup error:', error.message);
      throw error;
    }
    return data;
  }, []);

  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      throw error;
    }
    setUser(null);
    setSelectedTeamId('');
  }, []);

  const addTeamMutation = useMutation({
    mutationFn: async (team: Team) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      console.log('Adding team:', team);
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          id: team.id,
          user_id: user.id,
          name: team.name,
          record: team.record,
          player_count: team.playerCount,
          avg_ppg: team.avgPPG,
        }])
        .select()
        .single();
      if (error) {
        console.error('Error adding team:', error);
        throw new Error(`Failed to add team: ${error.message}`);
      }
      console.log('Team added successfully:', data);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      console.error('Error adding team:', error.message);
      alert(`Error adding team: ${error.message}`);
    },
  });

  const addTeam = useCallback(async (team: Team) => {
    return addTeamMutation.mutateAsync(team);
  }, [addTeamMutation]);

  const addPlayerMutation = useMutation({
    mutationFn: async (player: Player) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      console.log('Adding player:', player);
      
      const isTemporaryTeam = player.teamId && player.teamId.startsWith('temp-opponent-');
      
      try {
        const { data, error } = await supabase
          .from('players')
          .insert([{
            id: player.id,
            user_id: user.id,
            team_id: isTemporaryTeam ? null : (player.teamId || null),
            name: player.name,
            jersey_number: player.jerseyNumber,
            position: player.position || null,
          }])
          .select()
          .single();
        if (error) {
          console.error('Error adding player:', error);
          throw new Error(`Failed to add player: ${error.message}`);
        }
        console.log('Player added successfully:', data);
        return data;
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('fetch')) {
            console.error('Network error when adding player');
            throw new Error('Network error. Please check your internet connection.');
          }
          throw err;
        }
        throw new Error('Unknown error occurred while adding player');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['players'] });
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      console.error('Error adding player:', error.message);
      alert(`Error adding player: ${error.message}`);
    },
  });

  const addPlayer = useCallback(async (player: Player) => {
    return addPlayerMutation.mutateAsync(player);
  }, [addPlayerMutation]);

  const updatePlayerMutation = useMutation({
    mutationFn: async (updatedPlayer: Player) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      
      console.log('Attempting to update player in database:', updatedPlayer.id, updatedPlayer.name);
      
      const minimalUpdateData = {
        name: updatedPlayer.name,
        jersey_number: updatedPlayer.jerseyNumber,
        position: updatedPlayer.position,
        updated_at: new Date().toISOString(),
      };
      
      const statsUpdateData = {
        ...minimalUpdateData,
        games_played: updatedPlayer.stats.gamesPlayed,
        points: updatedPlayer.stats.points,
        assists: updatedPlayer.stats.assists,
        rebounds: updatedPlayer.stats.rebounds,
        offensive_rebounds: updatedPlayer.stats.offensiveRebounds,
        defensive_rebounds: updatedPlayer.stats.defensiveRebounds,
        steals: updatedPlayer.stats.steals,
        blocks: updatedPlayer.stats.blocks,
        turnovers: updatedPlayer.stats.turnovers,
        fouls: updatedPlayer.stats.fouls,
      };
      
      const fullUpdateData = {
        ...statsUpdateData,
        field_goals_made: updatedPlayer.stats.fieldGoalsMade,
        field_goals_attempted: updatedPlayer.stats.fieldGoalsAttempted,
        three_pointers_made: updatedPlayer.stats.threePointersMade,
        three_pointers_attempted: updatedPlayer.stats.threePointersAttempted,
        free_throws_made: updatedPlayer.stats.freeThrowsMade,
        free_throws_attempted: updatedPlayer.stats.freeThrowsAttempted,
      };
      
      const tryUpdate = async (updateData: Record<string, unknown>, label: string) => {
        console.log(`Trying ${label} update...`);
        const { data, error } = await supabase
          .from('players')
          .update(updateData)
          .eq('id', updatedPlayer.id)
          .eq('user_id', user.id)
          .select()
          .single();
        return { data, error };
      };
      
      try {
        let result = await tryUpdate(fullUpdateData, 'full');
        
        if (result.error && (result.error.message.includes('column') || result.error.message.includes('schema'))) {
          console.log('Full update failed, trying stats update...');
          result = await tryUpdate(statsUpdateData, 'stats');
        }
        
        if (result.error && (result.error.message.includes('column') || result.error.message.includes('schema'))) {
          console.log('Stats update failed, trying minimal update...');
          result = await tryUpdate(minimalUpdateData, 'minimal');
        }
        
        if (result.error) {
          console.error('Supabase error updating player:', result.error);
          throw new Error(`Failed to update player: ${result.error.message}`);
        }
        
        if (!result.data) {
          throw new Error('Player not found in database. It may have been deleted.');
        }
        
        console.log('Player updated successfully in database:', result.data);
        return result.data;
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.message.includes('fetch')) {
            throw new Error('Network error. Please check your internet connection.');
          }
          throw err;
        }
        throw new Error('Unknown error occurred while updating player');
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['players'] });
    },
    onError: (error: Error) => {
      console.error('Error in updatePlayerMutation:', error.message);
    },
  });

  const updatePlayer = useCallback(async (updatedPlayer: Player) => {
    console.log('Updating player:', updatedPlayer.id, updatedPlayer.name);
    return updatePlayerMutation.mutateAsync(updatedPlayer);
  }, [updatePlayerMutation]);

  const addEventMutation = useMutation({
    mutationFn: async (event: Event) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');

      const eventId = ensureUuid(event.id);
      const normalizedTeamId = isUuid(event.teamId) ? event.teamId : null;

      if (!normalizedTeamId) {
        console.error('Invalid team ID detected while adding event:', {
          eventId,
          teamId: event.teamId,
          title: event.title,
        });
        throw new Error('Please select a valid team before adding an event.');
      }

      const eventPayload = {
        user_id: user.id,
        team_id: normalizedTeamId,
        type: event.type,
        title: event.title,
        opponent: event.opponent || null,
        team_name: event.teamName,
        date: event.date,
        time: event.time,
        location: event.location,
        is_home: event.isHome !== undefined ? event.isHome : true,
      };

      console.log('Adding event:', { ...event, id: eventId, normalizedTeamId });
      console.log('Adding event payload:', eventPayload);

      const { data, error } = await supabase
        .from('events')
        .insert([eventPayload])
        .select()
        .single();

      if (error) {
        console.error('Error adding event:', JSON.stringify(error, null, 2));
        throw new Error(formatEventCreationError(error));
      }

      console.log('Event added successfully:', data);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (error: Error) => {
      const errorMessage = formatEventCreationError(error);
      console.error('Error adding event:', errorMessage);
      alert(`Error adding event: ${errorMessage}`);
    },
  });

  const addEvent = useCallback((event: Event) => {
    addEventMutation.mutate(event);
  }, [addEventMutation]);

  const updateEventMutation = useMutation({
    mutationFn: async (updatedEvent: Event) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      console.log('Updating event in database:', updatedEvent.id, {
        date: updatedEvent.date,
        time: updatedEvent.time,
        title: updatedEvent.title,
        opponent: updatedEvent.opponent,
      });

      const updateData: Record<string, unknown> = {
        type: updatedEvent.type,
        title: updatedEvent.title,
        opponent: updatedEvent.opponent || null,
        team_id: updatedEvent.teamId,
        team_name: updatedEvent.teamName,
        date: updatedEvent.date,
        time: updatedEvent.time,
        location: updatedEvent.location,
        is_home: updatedEvent.isHome,
        updated_at: new Date().toISOString(),
      };

      console.log('Event update payload:', JSON.stringify(updateData));

      const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', updatedEvent.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to update event: ${error.message}`);
      }

      console.log('Event updated successfully:', data);
      return data;
    },
    onMutate: async (updatedEvent: Event) => {
      await queryClient.cancelQueries({ queryKey: ['events', user?.id] });
      const previousEvents = queryClient.getQueryData<Event[]>(['events', user?.id]);
      queryClient.setQueryData<Event[]>(['events', user?.id], (old) => {
        if (!old) return old;
        return old.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      });
      return { previousEvents };
    },
    onError: (error: Error, _updatedEvent, context) => {
      console.error('Error updating event:', error.message);
      if (context?.previousEvents) {
        queryClient.setQueryData(['events', user?.id], context.previousEvents);
      }
      alert(`Error updating event: ${error.message}`);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const updateEvent = useCallback((updatedEvent: Event) => {
    updateEventMutation.mutate(updatedEvent);
  }, [updateEventMutation]);

  const addGameMutation = useMutation({
    mutationFn: async (game: Game) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const { data, error } = await supabase
        .from('games')
        .insert([{
          id: game.id,
          user_id: user.id,
          home_team_id: game.homeTeamId,
          away_team_id: game.awayTeamId,
          home_score: game.homeScore,
          away_score: game.awayScore,
          quarter: game.quarter,
          date: game.date,
          location: game.location,
          player_game_stats: game.playerGameStats,
          on_court: game.onCourt,
          events: game.events,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['games'] });
    },
  });

  const addGame = useCallback((game: Game) => {
    addGameMutation.mutate(game);
  }, [addGameMutation]);

  const updateGameMutation = useMutation({
    mutationFn: async ({ gameId, updates }: { gameId: string; updates: Partial<Game> }) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const updateData: Record<string, unknown> = {};
      if (updates.homeScore !== undefined) updateData.home_score = updates.homeScore;
      if (updates.awayScore !== undefined) updateData.away_score = updates.awayScore;
      if (updates.quarter !== undefined) updateData.quarter = updates.quarter;
      if (updates.playerGameStats !== undefined) updateData.player_game_stats = updates.playerGameStats;
      if (updates.onCourt !== undefined) updateData.on_court = updates.onCourt;
      if (updates.events !== undefined) updateData.events = updates.events;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', gameId)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      void queryClient.invalidateQueries({ queryKey: ['players'] });
    },
  });

  const updateGame = useCallback((gameId: string, updates: Partial<Game>) => {
    updateGameMutation.mutate({ gameId, updates });
  }, [updateGameMutation]);

  const addPlayMutation = useMutation({
    mutationFn: async (play: Play) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const { data, error } = await supabase
        .from('plays')
        .insert([{
          id: play.id,
          user_id: user.id,
          name: play.name,
          drawing: play.drawing,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plays'] });
    },
  });

  const addPlay = useCallback((play: Play) => {
    addPlayMutation.mutate(play);
  }, [addPlayMutation]);

  const deletePlayMutation = useMutation({
    mutationFn: async (playId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const { error } = await supabase
        .from('plays')
        .delete()
        .eq('id', playId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['plays'] });
    },
  });

  const deletePlay = useCallback((playId: string) => {
    deletePlayMutation.mutate(playId);
  }, [deletePlayMutation]);

  const addFanMutation = useMutation({
    mutationFn: async (fan: Fan) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const { data, error } = await supabase
        .from('fans')
        .insert([{
          id: fan.id,
          user_id: user.id,
          team_id: fan.teamId,
          player_id: fan.playerId,
          name: fan.name,
          email: fan.email,
          player_name: fan.playerName,
          status: fan.status,
          joined_at: fan.joinedAt,
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fans'] });
    },
  });

  const addFan = useCallback((fan: Fan) => {
    addFanMutation.mutate(fan);
  }, [addFanMutation]);

  const updateFanMutation = useMutation({
    mutationFn: async (updatedFan: Fan) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const { data, error } = await supabase
        .from('fans')
        .update({
          name: updatedFan.name,
          email: updatedFan.email,
          player_id: updatedFan.playerId,
          player_name: updatedFan.playerName,
          status: updatedFan.status,
          joined_at: updatedFan.joinedAt,
        })
        .eq('id', updatedFan.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fans'] });
    },
  });

  const updateFan = useCallback((updatedFan: Fan) => {
    updateFanMutation.mutate(updatedFan);
  }, [updateFanMutation]);

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const deleteEvent = useCallback((eventId: string) => {
    return deleteEventMutation.mutateAsync(eventId);
  }, [deleteEventMutation]);

  const deleteFanMutation = useMutation({
    mutationFn: async (fanId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      const { error } = await supabase
        .from('fans')
        .delete()
        .eq('id', fanId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['fans'] });
    },
  });

  const deleteFan = useCallback((fanId: string) => {
    deleteFanMutation.mutate(fanId);
  }, [deleteFanMutation]);

  const updateTeamMutation = useMutation({
    mutationFn: async (updatedTeam: Team) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      console.log('Updating team:', updatedTeam);
      const { data, error } = await supabase
        .from('teams')
        .update({
          name: updatedTeam.name,
          record: updatedTeam.record,
          player_count: updatedTeam.playerCount,
          avg_ppg: updatedTeam.avgPPG,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedTeam.id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) {
        console.error('Error updating team:', error);
        throw new Error(`Failed to update team: ${error.message}`);
      }
      console.log('Team updated successfully:', data);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
    },
    onError: (error: Error) => {
      console.error('Error updating team:', error.message);
    },
  });

  const updateTeam = useCallback(async (updatedTeam: Team) => {
    return updateTeamMutation.mutateAsync(updatedTeam);
  }, [updateTeamMutation]);

  const deleteTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      if (!isSupabaseConfigured) throw new Error('Database not configured');
      // Delete all related data first
      await supabase.from('players').delete().eq('team_id', teamId).eq('user_id', user.id);
      await supabase.from('events').delete().eq('team_id', teamId).eq('user_id', user.id);
      await supabase.from('fans').delete().eq('team_id', teamId).eq('user_id', user.id);
      // Then delete the team
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teams'] });
      void queryClient.invalidateQueries({ queryKey: ['players'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['fans'] });
    },
  });

  const deleteTeam = useCallback((teamId: string) => {
    return deleteTeamMutation.mutateAsync(teamId);
  }, [deleteTeamMutation]);

  return useMemo(() => ({
    user,
    session,
    selectedTeamId,
    setSelectedTeamId,
    teams,
    players,
    events,
    messages,
    games,
    plays,
    fans,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    addTeam,
    updateTeam,
    addPlayer,
    updatePlayer,
    addEvent,
    updateEvent,
    addGame,
    updateGame,
    addPlay,
    deletePlay,
    addFan,
    updateFan,
    deleteFan,
    deleteTeam,
    deleteEvent,
    isLoading: authLoading || (!!user?.id && (teamsQuery.isLoading || playersQuery.isLoading || eventsQuery.isLoading)),
  }), [user, session, selectedTeamId, teams, players, events, messages, games, plays, fans, login, signup, logout, addTeam, updateTeam, addPlayer, updatePlayer, addEvent, updateEvent, addGame, updateGame, addPlay, deletePlay, addFan, updateFan, deleteFan, deleteTeam, deleteEvent, teamsQuery.isLoading, playersQuery.isLoading, eventsQuery.isLoading, authLoading]);
});
