import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RotateCcw, UserPlus, ChevronLeft, Users, Dribbble, Trophy, ChevronDown, RefreshCw, User, Hand, Ban, Repeat, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/contexts/AppContext';
import { useState, useEffect, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AddPlayerModal from '@/components/AddPlayerModal';
import { Player, PlayerGameStats, Team } from '@/types';

export default function ScoreScreen() {
  const { players, teams, events, addPlayer, addGame, updatePlayer, updateTeam, updateEvent } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ teamId?: string; opponent?: string; eventTitle?: string; eventId?: string }>();
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [quarter, setQuarter] = useState<number>(1);
  const [homeScore, setHomeScore] = useState<number>(0);
  const [awayScore, setAwayScore] = useState<number>(0);
  const [activeTeam, setActiveTeam] = useState<'home' | 'away'>('home');
  const [homeTeamId, setHomeTeamId] = useState<string>('');
  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [opponentName, setOpponentName] = useState<string>('');
  const [onCourt, setOnCourt] = useState<string[]>([]);
  const [addPlayerModalVisible, setAddPlayerModalVisible] = useState<boolean>(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [gameStats, setGameStats] = useState<Record<string, PlayerGameStats>>({});
  const [lastAction, setLastAction] = useState<{
    type: 'stat' | 'score';
    playerId?: string;
    statKey?: keyof PlayerGameStats;
    team?: 'home' | 'away';
    value: number;
    additionalStats?: Partial<PlayerGameStats>;
  } | null>(null);
  const [temporaryPlayers, setTemporaryPlayers] = useState<Player[]>([]);
  const [gameSummaryVisible, setGameSummaryVisible] = useState<boolean>(false);
  const [endingGame, setEndingGame] = useState<boolean>(false);
  const [showTwoPointModal, setShowTwoPointModal] = useState<boolean>(false);
  const [showReboundModal, setShowReboundModal] = useState<boolean>(false);
  const [showThreePointModal, setShowThreePointModal] = useState<boolean>(false);
  const [showPlayerStatsModal, setShowPlayerStatsModal] = useState<boolean>(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [summaryTeamTab, setSummaryTeamTab] = useState<'home' | 'away'>('home');
  const [statsFinalized, setStatsFinalized] = useState<boolean>(false);

  useEffect(() => {
    if (params.teamId && teams.length > 0 && !gameStarted) {
      const team = teams.find(t => t.id === params.teamId);
      if (team) {
        console.log('Auto-selecting team from event:', team.name, 'TeamID:', team.id, 'Opponent:', params.opponent);
        console.log('Available players:', players.length, 'Players for this team:', players.filter(p => p.teamId === team.id).length);
        const generateUUID = () => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        setSelectedTeam(team);
        setHomeTeamId(team.id);
        setAwayTeamId(`temp-opponent-${generateUUID()}`);
        setOpponentName(params.opponent || '');
        setGameStarted(true);
        setOnCourt([]);
        setGameStats({});
        setHomeScore(0);
        setAwayScore(0);
        setQuarter(1);
      }
    }
  }, [params.teamId, params.opponent, teams, gameStarted, players]);

  const handleSelectTeam = (team: Team) => {
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    setSelectedTeam(team);
    setHomeTeamId(team.id);
    setAwayTeamId(`temp-opponent-${generateUUID()}`);
    setOpponentName('');
    setGameStarted(true);
    setOnCourt([]);
    setGameStats({});
    setHomeScore(0);
    setAwayScore(0);
    setQuarter(1);
    console.log('Starting game with team:', team.name);
  };

  const handleBackToTeamSelect = () => {
    setGameStarted(false);
    setSelectedTeam(null);
    setOpponentName('');
    setTemporaryPlayers([]);
    setGameSummaryVisible(false);
    setSelectedPlayerId(null);
    setStatsFinalized(false);
  };

  const handleEndGame = async () => {
    Alert.alert(
      'End Game',
      'Are you sure you want to end this game? All stats will be saved to player records and team record will be updated.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Game',
          style: 'destructive',
          onPress: async () => {
            setEndingGame(true);
            try {
              const generateUUID = () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                  const r = Math.random() * 16 | 0;
                  const v = c === 'x' ? r : (r & 0x3 | 0x8);
                  return v.toString(16);
                });
              };

              const gameId = generateUUID();
              const now = new Date();

              await addGame({
                id: gameId,
                homeTeamId: homeTeamId,
                awayTeamId: awayTeamId,
                homeScore,
                awayScore,
                quarter,
                date: now.toISOString(),
                location: params.eventTitle || 'Game',
                playerGameStats: gameStats,
                onCourt,
                events: [],
              });

              if (params.eventId) {
                const eventToUpdate = events.find(e => e.id === params.eventId);
                if (eventToUpdate) {
                  updateEvent({
                    ...eventToUpdate,
                    gameResult: {
                      homeScore,
                      awayScore,
                      gameId,
                      playerStats: gameStats,
                      completedAt: now.toISOString(),
                    },
                  });
                  console.log('Updated event with game result:', params.eventId);
                }
              }

              const realPlayers = allPlayers.filter(p => !p.teamId.startsWith('temp-opponent-'));
              
              for (const player of realPlayers) {
                const playerStats = gameStats[player.id];
                if (playerStats) {
                  const updatedPlayer: Player = {
                    ...player,
                    stats: {
                      gamesPlayed: player.stats.gamesPlayed + 1,
                      points: player.stats.points + playerStats.points,
                      assists: player.stats.assists + playerStats.assists,
                      rebounds: player.stats.rebounds + playerStats.offensiveRebounds + playerStats.defensiveRebounds,
                      offensiveRebounds: player.stats.offensiveRebounds + playerStats.offensiveRebounds,
                      defensiveRebounds: player.stats.defensiveRebounds + playerStats.defensiveRebounds,
                      steals: player.stats.steals + playerStats.steals,
                      blocks: player.stats.blocks + playerStats.blocks,
                      turnovers: player.stats.turnovers + playerStats.turnovers,
                      fouls: player.stats.fouls + playerStats.fouls,
                      fieldGoalsMade: player.stats.fieldGoalsMade + playerStats.fieldGoalsMade,
                      fieldGoalsAttempted: player.stats.fieldGoalsAttempted + playerStats.fieldGoalsAttempted,
                      threePointersMade: player.stats.threePointersMade + playerStats.threePointersMade,
                      threePointersAttempted: player.stats.threePointersAttempted + playerStats.threePointersAttempted,
                      freeThrowsMade: player.stats.freeThrowsMade + playerStats.freeThrowsMade,
                      freeThrowsAttempted: player.stats.freeThrowsAttempted + playerStats.freeThrowsAttempted,
                    },
                  };
                  await updatePlayer(updatedPlayer);
                  console.log('Updated player stats:', updatedPlayer.name, updatedPlayer.stats);
                }
              }

              if (selectedTeam) {
                const currentRecord = selectedTeam.record || '0-0';
                const [wins, losses] = currentRecord.split('-').map(Number);
                const isWin = homeScore > awayScore;
                const isTie = homeScore === awayScore;
                
                let newWins = wins || 0;
                let newLosses = losses || 0;
                
                if (isWin) {
                  newWins += 1;
                } else if (!isTie) {
                  newLosses += 1;
                }
                
                const newRecord = `${newWins}-${newLosses}`;
                
                const totalPoints = realPlayers.reduce((sum, player) => {
                  const stats = gameStats[player.id];
                  return sum + (stats?.points || 0);
                }, 0);
                
                const gamesPlayed = newWins + newLosses;
                const currentAvgPPG = selectedTeam.avgPPG || 0;
                const previousGames = gamesPlayed - 1;
                const newAvgPPG = previousGames > 0 
                  ? Math.round(((currentAvgPPG * previousGames) + totalPoints) / gamesPlayed * 10) / 10
                  : totalPoints;
                
                const updatedTeam = {
                  ...selectedTeam,
                  record: newRecord,
                  avgPPG: newAvgPPG,
                };
                
                await updateTeam(updatedTeam);
                console.log('Updated team record:', selectedTeam.name, newRecord, 'Avg PPG:', newAvgPPG);
              }

              console.log('Game ended successfully, showing summary');
              setStatsFinalized(true);
              setGameSummaryVisible(true);
            } catch (error) {
              console.error('Error ending game:', error);
              Alert.alert('Error', 'Failed to save game. Please try again.');
            } finally {
              setEndingGame(false);
            }
          },
        },
      ]
    );
  };

  const currentTeamId = activeTeam === 'home' ? homeTeamId : awayTeamId;
  
  const allPlayers = [...players, ...temporaryPlayers];
  const teamPlayers = allPlayers.filter((p) => p.teamId === currentTeamId);
  
  useEffect(() => {
    if (gameStarted && currentTeamId) {
      console.log('Score page - currentTeamId:', currentTeamId, 'Total players:', allPlayers.length, 'Team players:', teamPlayers.length);
    }
  }, [gameStarted, currentTeamId, allPlayers.length, teamPlayers.length]);
  

  const adjustScore = (team: 'home' | 'away', delta: number) => {
    if (team === 'home') {
      setHomeScore(Math.max(0, homeScore + delta));
    } else {
      setAwayScore(Math.max(0, awayScore + delta));
    }
    if (delta !== 0) {
      setLastAction({
        type: 'score',
        team,
        value: delta,
      });
    }
  };



  const handleSaveNewPlayer = async (playerData: { name: string; jerseyNumber: string; position: string }) => {
    try {
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const newPlayer: Player = {
        id: generateUUID(),
        name: playerData.name,
        jerseyNumber: playerData.jerseyNumber,
        position: playerData.position,
        teamId: currentTeamId,
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
      
      const isTemporaryTeam = currentTeamId.startsWith('temp-opponent-');
      
      if (isTemporaryTeam) {
        setTemporaryPlayers((prev) => [...prev, newPlayer]);
        console.log('Created temporary player for opponent team:', newPlayer);
      } else {
        await addPlayer(newPlayer);
        console.log('Created new player for bench:', newPlayer);
      }
    } catch (error) {
      console.error('Error in handleSaveNewPlayer:', error);
    }
  };

  const getPlayerGameStats = useCallback((playerId: string): PlayerGameStats => {
    return gameStats[playerId] || {
      points: 0,
      assists: 0,
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
    };
  }, [gameStats]);

  const updatePlayerStat = (statKey: keyof PlayerGameStats, delta: number, additionalStats?: Partial<PlayerGameStats>) => {
    if (!selectedPlayerId) {
      Alert.alert('Select Player', 'Please select a player first');
      return;
    }

    const currentStats = getPlayerGameStats(selectedPlayerId);
    const newStats = { ...currentStats };
    newStats[statKey] = Math.max(0, currentStats[statKey] + delta);
    
    if (additionalStats) {
      Object.keys(additionalStats).forEach((key) => {
        const k = key as keyof PlayerGameStats;
        newStats[k] = Math.max(0, currentStats[k] + (additionalStats[k] || 0));
      });
    }

    setGameStats((prev) => ({
      ...prev,
      [selectedPlayerId]: newStats,
    }));

    if (statKey === 'points' && delta > 0) {
      const player = allPlayers.find(p => p.id === selectedPlayerId);
      if (player) {
        if (player.teamId === homeTeamId) {
          setHomeScore(prev => prev + delta);
        } else if (player.teamId === awayTeamId) {
          setAwayScore(prev => prev + delta);
        }
      }
    }

    setLastAction({
      type: 'stat',
      playerId: selectedPlayerId,
      statKey,
      value: delta,
      additionalStats,
    });

    console.log('Updated stat:', statKey, 'for player:', selectedPlayerId);
  };

  const handleAddPoints = (points: number) => {
    if (points === 1) {
      updatePlayerStat('points', 1);
    } else if (points === 2) {
      updatePlayerStat('points', 2, { fieldGoalsMade: 1, fieldGoalsAttempted: 1 });
    } else if (points === 3) {
      updatePlayerStat('points', 3, { threePointersMade: 1, threePointersAttempted: 1, fieldGoalsMade: 1, fieldGoalsAttempted: 1 });
    }
  };

  const handleTwoPointAttempt = (made: boolean) => {
    if (!selectedPlayerId) {
      Alert.alert('Select Player', 'Please select a player first');
      setShowTwoPointModal(false);
      return;
    }
    if (made) {
      updatePlayerStat('points', 2, { fieldGoalsMade: 1, fieldGoalsAttempted: 1 });
    } else {
      updatePlayerStat('fieldGoalsAttempted', 1);
    }
    setShowTwoPointModal(false);
  };

  const handleReboundType = (type: 'offensive' | 'defensive') => {
    if (!selectedPlayerId) {
      Alert.alert('Select Player', 'Please select a player first');
      setShowReboundModal(false);
      return;
    }
    if (type === 'offensive') {
      updatePlayerStat('offensiveRebounds', 1);
    } else {
      updatePlayerStat('defensiveRebounds', 1);
    }
    setShowReboundModal(false);
  };

  const handleThreePointAttempt = (made: boolean) => {
    if (!selectedPlayerId) {
      Alert.alert('Select Player', 'Please select a player first');
      setShowThreePointModal(false);
      return;
    }
    if (made) {
      updatePlayerStat('points', 3, { threePointersMade: 1, threePointersAttempted: 1, fieldGoalsMade: 1, fieldGoalsAttempted: 1 });
    } else {
      updatePlayerStat('threePointersAttempted', 1, { fieldGoalsAttempted: 1 });
    }
    setShowThreePointModal(false);
  };

  const handleOpenPlayerStats = (playerId: string) => {
    setEditingPlayerId(playerId);
    setShowPlayerStatsModal(true);
  };

  const handleUpdatePlayerStatDirect = (playerId: string, statKey: keyof PlayerGameStats, delta: number) => {
    const currentStats = getPlayerGameStats(playerId);
    const newStats = { ...currentStats };
    newStats[statKey] = Math.max(0, currentStats[statKey] + delta);

    setGameStats((prev) => ({
      ...prev,
      [playerId]: newStats,
    }));

    if (statKey === 'points' && delta !== 0) {
      const player = allPlayers.find(p => p.id === playerId);
      if (player) {
        if (player.teamId === homeTeamId) {
          setHomeScore(prev => Math.max(0, prev + delta));
        } else if (player.teamId === awayTeamId) {
          setAwayScore(prev => Math.max(0, prev + delta));
        }
      }
    }

    console.log('Direct stat update:', statKey, delta, 'for player:', playerId);
  };

  const getEditingPlayer = () => {
    if (!editingPlayerId) return null;
    return allPlayers.find(p => p.id === editingPlayerId);
  };

  const handleFreeThrow = (made: boolean) => {
    if (made) {
      updatePlayerStat('points', 1, { freeThrowsMade: 1, freeThrowsAttempted: 1 });
    } else {
      updatePlayerStat('freeThrowsAttempted', 1);
    }
  };

  const handleUndo = () => {
    if (!lastAction) {
      console.log('No action to undo');
      return;
    }

    if (lastAction.type === 'stat' && lastAction.playerId && lastAction.statKey) {
      const playerId = lastAction.playerId;
      const statKey = lastAction.statKey;
      const delta = lastAction.value;
      const additionalStats = lastAction.additionalStats;
      
      setGameStats((prev) => {
        const playerStats = prev[playerId] || getPlayerGameStats(playerId);
        const newStats = { ...playerStats };
        newStats[statKey] = Math.max(0, playerStats[statKey] - delta);
        
        if (additionalStats) {
          Object.keys(additionalStats).forEach((key) => {
            const k = key as keyof PlayerGameStats;
            newStats[k] = Math.max(0, playerStats[k] - (additionalStats[k] || 0));
          });
        }
        
        return {
          ...prev,
          [playerId]: newStats,
        };
      });
      
      if (statKey === 'points') {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
          if (player.teamId === homeTeamId) {
            setHomeScore(prev => Math.max(0, prev - delta));
          } else if (player.teamId === awayTeamId) {
            setAwayScore(prev => Math.max(0, prev - delta));
          }
        }
      }
      
      console.log('Undid stat action:', lastAction);
      setLastAction(null);
    } else if (lastAction.type === 'score' && lastAction.team) {
      if (lastAction.team === 'home') {
        setHomeScore(prev => Math.max(0, prev - lastAction.value));
      } else {
        setAwayScore(prev => Math.max(0, prev - lastAction.value));
      }
      console.log('Undid score action:', lastAction);
      setLastAction(null);
    }
  };

  const getQuarterLabel = () => {
    const labels = ['1ST QTR', '2ND QTR', '3RD QTR', '4TH QTR', 'OT'];
    return labels[quarter - 1] || `Q${quarter}`;
  };

  if (!gameStarted) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.teamSelectHeader}>
          <Text style={styles.teamSelectTitle}>Score Game</Text>
          <Text style={styles.teamSelectSubtitle}>Select a team to start scoring</Text>
        </View>

        <ScrollView 
          style={styles.teamSelectScroll}
          contentContainerStyle={styles.teamSelectContent}
          showsVerticalScrollIndicator={false}
        >
          {teams.length === 0 ? (
            <View style={styles.noTeamsContainer}>
              <View style={styles.noTeamsIcon}>
                <Users size={48} color="#666" />
              </View>
              <Text style={styles.noTeamsText}>No teams available</Text>
              <Text style={styles.noTeamsSubtext}>Create a team first to start scoring games</Text>
            </View>
          ) : (
            teams.map((team) => {
              const teamPlayerCount = players.filter(p => p.teamId === team.id).length;
              return (
                <TouchableOpacity
                  key={team.id}
                  style={styles.teamSelectCard}
                  onPress={() => handleSelectTeam(team)}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={['#1A1A1A', '#252525']}
                    style={styles.teamSelectCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.teamSelectCardContent}>
                      <View style={styles.teamSelectIcon}>
                        <Dribbble size={28} color="#FFFFFF" />
                      </View>
                      <View style={styles.teamSelectInfo}>
                        <Text style={styles.teamSelectName}>{team.name}</Text>
                        <Text style={styles.teamSelectDetails}>
                          {teamPlayerCount} {teamPlayerCount === 1 ? 'player' : 'players'}
                        </Text>
                      </View>
                      <View style={styles.teamSelectArrow}>
                        <ChevronLeft size={24} color="#666" style={{ transform: [{ rotate: '180deg' }] }} />
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToTeamSelect}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Scoring</Text>
        <TouchableOpacity 
          style={styles.undoButton}
          onPress={handleUndo}
          disabled={!lastAction}
          activeOpacity={0.7}
        >
          <RotateCcw size={18} color={lastAction ? '#ff6900' : '#666'} />
          <Text style={[styles.undoText, lastAction && styles.undoTextActive]}>UNDO LAST</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.scoreSection}>
          <View style={styles.scoreBox}>
            <TouchableOpacity 
              style={styles.scoreAdjustButton}
              onPress={() => adjustScore('home', -1)}
            >
              <Text style={styles.scoreAdjustText}>−</Text>
            </TouchableOpacity>
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreValue}>{homeScore}</Text>
              <Text style={styles.scoreLabel}>HOME</Text>
            </View>
            <TouchableOpacity 
              style={styles.scoreAdjustButton}
              onPress={() => adjustScore('home', 1)}
            >
              <Text style={styles.scoreAdjustText}>+</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.quarterSelector}
            onPress={() => setQuarter((prev) => (prev >= 5 ? 1 : prev + 1))}
            activeOpacity={0.7}
          >
            <Text style={styles.quarterText}>{getQuarterLabel()}</Text>
            <ChevronDown size={16} color="#ff6900" />
          </TouchableOpacity>

          <View style={styles.scoreBox}>
            <TouchableOpacity 
              style={styles.scoreAdjustButton}
              onPress={() => adjustScore('away', -1)}
            >
              <Text style={styles.scoreAdjustText}>−</Text>
            </TouchableOpacity>
            <View style={styles.scoreDisplay}>
              <Text style={styles.scoreValue}>{awayScore}</Text>
              <Text style={styles.scoreLabel}>OPP</Text>
            </View>
            <TouchableOpacity 
              style={styles.scoreAdjustButton}
              onPress={() => adjustScore('away', 1)}
            >
              <Text style={styles.scoreAdjustText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.teamToggle}>
          <TouchableOpacity
            style={[styles.teamToggleButton, activeTeam === 'home' && styles.teamToggleButtonActive]}
            onPress={() => { setActiveTeam('home'); setSelectedPlayerId(null); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.teamToggleText, activeTeam === 'home' && styles.teamToggleTextActive]}>
              HOME TEAM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.teamToggleButton, activeTeam === 'away' && styles.teamToggleButtonActive]}
            onPress={() => { setActiveTeam('away'); setSelectedPlayerId(null); }}
            activeOpacity={0.7}
          >
            <Text style={[styles.teamToggleText, activeTeam === 'away' && styles.teamToggleTextActive]}>
              AWAY TEAM
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.onCourtSection}>
          <View style={styles.onCourtHeader}>
            <Text style={styles.onCourtLabel}>On Court</Text>
          </View>
          <View style={styles.onCourtContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.onCourtScrollView} contentContainerStyle={styles.onCourtPlayersRow}>
              <TouchableOpacity
                style={styles.benchCircle}
                onPress={() => setAddPlayerModalVisible(true)}
                activeOpacity={0.7}
              >
                <UserPlus size={20} color="#888" />
                <Text style={styles.benchCircleLabel}>BENCH</Text>
              </TouchableOpacity>
              {teamPlayers.length === 0 ? (
                <View style={styles.noPlayersHintContainer}>
                  <Text style={styles.noPlayersHint}>Tap BENCH to add players</Text>
                </View>
              ) : (
                teamPlayers.map((player) => {
                  const isSelected = selectedPlayerId === player.id;
                  return (
                    <TouchableOpacity
                      key={player.id}
                      style={[
                        styles.playerCircle,
                        isSelected && styles.playerCircleActive,
                      ]}
                      onPress={() => setSelectedPlayerId(player.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.playerCircleNumber, isSelected && styles.playerCircleNumberActive]}>
                        {player.jerseyNumber.padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            {selectedPlayerId && (
              <View style={styles.selectedPlayerIndicator}>
                <Text style={styles.selectedPlayerLabel}>ACTIVE</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.pointButtonsRow}>
          <TouchableOpacity
            style={styles.pointButton}
            onPress={() => handleAddPoints(1)}
            activeOpacity={0.7}
          >
            <Text style={styles.pointButtonValue}>+1</Text>
            <Text style={styles.pointButtonLabel}>POINT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pointButton}
            onPress={() => {
              if (!selectedPlayerId) {
                Alert.alert('Select Player', 'Please select a player first');
                return;
              }
              setShowTwoPointModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.pointButtonValue}>+2</Text>
            <Text style={styles.pointButtonLabel}>POINTS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pointButton, styles.pointButtonHighlight]}
            onPress={() => {
              if (!selectedPlayerId) {
                Alert.alert('Select Player', 'Please select a player first');
                return;
              }
              setShowThreePointModal(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.pointButtonValue}>+3</Text>
            <Text style={styles.pointButtonLabel}>POINTS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.freeThrowRow}>
          <TouchableOpacity
            style={styles.ftMadeButton}
            onPress={() => handleFreeThrow(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.ftMadeText}>FT MADE</Text>
            <Text style={styles.ftMadeSubtext}>+1 POINT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.ftMissButton}
            onPress={() => handleFreeThrow(false)}
            activeOpacity={0.7}
          >
            <Text style={styles.ftMissText}>FT MISS</Text>
            <Text style={styles.ftMissSubtext}>0 POINTS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statButton}
              onPress={() => {
                if (!selectedPlayerId) {
                  Alert.alert('Select Player', 'Please select a player first');
                  return;
                }
                setShowReboundModal(true);
              }}
              activeOpacity={0.7}
            >
              <RefreshCw size={24} color="#FFFFFF" />
              <Text style={styles.statButtonLabel}>REB</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statButton}
              onPress={() => updatePlayerStat('assists', 1)}
              activeOpacity={0.7}
            >
              <User size={24} color="#FFFFFF" />
              <Text style={styles.statButtonLabel}>AST</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statButton}
              onPress={() => updatePlayerStat('steals', 1)}
              activeOpacity={0.7}
            >
              <Hand size={24} color="#FFFFFF" />
              <Text style={styles.statButtonLabel}>STL</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <TouchableOpacity
              style={styles.statButton}
              onPress={() => updatePlayerStat('blocks', 1)}
              activeOpacity={0.7}
            >
              <Ban size={24} color="#FFFFFF" />
              <Text style={styles.statButtonLabel}>BLK</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statButton}
              onPress={() => updatePlayerStat('turnovers', 1)}
              activeOpacity={0.7}
            >
              <Repeat size={24} color="#FFFFFF" />
              <Text style={styles.statButtonLabel}>TO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.foulButton}
              onPress={() => updatePlayerStat('fouls', 1)}
              activeOpacity={0.7}
            >
              <AlertTriangle size={24} color="#ff6900" />
              <Text style={styles.foulButtonLabel}>FOUL</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.playerStatsSection}>
          <Text style={styles.playerStatsSectionTitle}>PLAYER STATS ({activeTeam === 'home' ? 'HOME' : 'AWAY'})</Text>
          <View style={styles.playerStatsGrid}>
            {teamPlayers.map((player) => {
              const stats = getPlayerGameStats(player.id);
              const isSelected = selectedPlayerId === player.id;
              return (
                <TouchableOpacity
                  key={player.id}
                  style={[styles.playerStatCard, isSelected && styles.playerStatCardActive]}
                  onPress={() => handleOpenPlayerStats(player.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.playerStatNumber, isSelected && styles.playerStatNumberActive]}>
                    {player.jerseyNumber.padStart(2, '0')}
                  </Text>
                  <Text style={[styles.playerStatFouls, isSelected && styles.playerStatFoulsActive]}>
                    {stats.fouls} FLS
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity
          style={styles.endGameButton}
          onPress={handleEndGame}
          disabled={endingGame}
          activeOpacity={0.7}
        >
          <Trophy size={20} color="#FFFFFF" />
          <Text style={styles.endGameButtonText}>{endingGame ? 'Saving...' : 'End Game'}</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddPlayerModal
        visible={addPlayerModalVisible}
        onClose={() => setAddPlayerModalVisible(false)}
        onSave={handleSaveNewPlayer}
      />

      {showTwoPointModal && (
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModal}>
            <Text style={styles.actionModalTitle}>2-Point Attempt</Text>
            <View style={styles.actionModalButtons}>
              <TouchableOpacity
                style={styles.actionModalButtonMade}
                onPress={() => handleTwoPointAttempt(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionModalButtonText}>MADE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionModalButtonMissed}
                onPress={() => handleTwoPointAttempt(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionModalButtonText}>MISSED</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.actionModalCancel}
              onPress={() => setShowTwoPointModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showReboundModal && (
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModal}>
            <Text style={styles.actionModalTitle}>Rebound Type</Text>
            <View style={styles.actionModalButtons}>
              <TouchableOpacity
                style={styles.actionModalButtonOffensive}
                onPress={() => handleReboundType('offensive')}
                activeOpacity={0.7}
              >
                <Text style={styles.actionModalButtonText}>OFFENSIVE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionModalButtonDefensive}
                onPress={() => handleReboundType('defensive')}
                activeOpacity={0.7}
              >
                <Text style={styles.actionModalButtonText}>DEFENSIVE</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.actionModalCancel}
              onPress={() => setShowReboundModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showThreePointModal && (
        <View style={styles.actionModalOverlay}>
          <View style={styles.actionModal}>
            <Text style={styles.actionModalTitle}>3-Point Attempt</Text>
            <View style={styles.actionModalButtons}>
              <TouchableOpacity
                style={styles.actionModalButtonMade}
                onPress={() => handleThreePointAttempt(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionModalButtonText}>MADE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionModalButtonMissed}
                onPress={() => handleThreePointAttempt(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionModalButtonText}>MISSED</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.actionModalCancel}
              onPress={() => setShowThreePointModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPlayerStatsModal && editingPlayerId && (
        <View style={styles.playerStatsModalOverlay}>
          <View style={styles.playerStatsModal}>
            <View style={styles.playerStatsModalHeader}>
              <Text style={styles.playerStatsModalTitle}>
                {getEditingPlayer()?.name || 'Player'}
              </Text>
              <TouchableOpacity
                style={styles.playerStatsModalClose}
                onPress={() => {
                  setShowPlayerStatsModal(false);
                  setEditingPlayerId(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.playerStatsModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.playerStatsModalContent} showsVerticalScrollIndicator={false}>
              {[
                { key: 'points', label: 'Points' },
                { key: 'rebounds', label: 'Rebounds', computed: true },
                { key: 'assists', label: 'Assists' },
                { key: 'steals', label: 'Steals' },
                { key: 'blocks', label: 'Blocks' },
                { key: 'turnovers', label: 'Turnovers' },
                { key: 'fouls', label: 'Fouls', highlight: true },
              ].map((stat) => {
                const stats = getPlayerGameStats(editingPlayerId);
                let value = 0;
                if (stat.key === 'rebounds') {
                  value = stats.offensiveRebounds + stats.defensiveRebounds;
                } else {
                  value = stats[stat.key as keyof PlayerGameStats] || 0;
                }
                return (
                  <View key={stat.key} style={styles.playerStatsModalRow}>
                    <Text style={[styles.playerStatsModalLabel, stat.highlight && styles.playerStatsModalLabelHighlight]}>
                      {stat.label}
                    </Text>
                    <View style={styles.playerStatsModalControls}>
                      <TouchableOpacity
                        style={styles.playerStatsModalButton}
                        onPress={() => {
                          if (stat.key === 'rebounds') {
                            handleUpdatePlayerStatDirect(editingPlayerId, 'defensiveRebounds', -1);
                          } else {
                            handleUpdatePlayerStatDirect(editingPlayerId, stat.key as keyof PlayerGameStats, -1);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.playerStatsModalButtonText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.playerStatsModalValue}>{value}</Text>
                      <TouchableOpacity
                        style={[styles.playerStatsModalButton, styles.playerStatsModalButtonPlus]}
                        onPress={() => {
                          if (stat.key === 'rebounds') {
                            handleUpdatePlayerStatDirect(editingPlayerId, 'defensiveRebounds', 1);
                          } else {
                            handleUpdatePlayerStatDirect(editingPlayerId, stat.key as keyof PlayerGameStats, 1);
                          }
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.playerStatsModalButtonText, styles.playerStatsModalButtonTextPlus]}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {gameSummaryVisible && (
        <View style={styles.gameSummaryOverlay}>
          <View style={styles.gameSummaryModal}>
            <View style={styles.gameSummaryHeader}>
              <Text style={styles.gameSummaryTitle}>Game Complete!</Text>
              <View style={styles.finalScoreContainer}>
                <View style={styles.finalTeamScore}>
                  <Text style={styles.finalTeamName}>{selectedTeam?.name || 'Home'}</Text>
                  <Text style={[styles.finalScore, homeScore > awayScore && styles.winningScore]}>{homeScore}</Text>
                </View>
                <Text style={styles.scoreDivider}>-</Text>
                <View style={styles.finalTeamScore}>
                  <Text style={styles.finalTeamName}>{opponentName || 'Away'}</Text>
                  <Text style={[styles.finalScore, awayScore > homeScore && styles.winningScore]}>{awayScore}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.summaryTeamToggle}>
              <TouchableOpacity
                style={[styles.summaryTeamToggleButton, summaryTeamTab === 'home' && styles.summaryTeamToggleButtonActive]}
                onPress={() => setSummaryTeamTab('home')}
                activeOpacity={0.7}
              >
                <Text style={[styles.summaryTeamToggleText, summaryTeamTab === 'home' && styles.summaryTeamToggleTextActive]}>
                  {selectedTeam?.name || 'Home'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.summaryTeamToggleButton, summaryTeamTab === 'away' && styles.summaryTeamToggleButtonActive]}
                onPress={() => setSummaryTeamTab('away')}
                activeOpacity={0.7}
              >
                <Text style={[styles.summaryTeamToggleText, summaryTeamTab === 'away' && styles.summaryTeamToggleTextActive]}>
                  {opponentName || 'Away'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.gameSummaryContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.statsTitle}>Player Stats</Text>
              {(() => {
                const currentSummaryTeamId = summaryTeamTab === 'home' ? homeTeamId : awayTeamId;
                const filteredEntries = Object.entries(gameStats).filter(([playerId]) => {
                  const player = allPlayers.find(p => p.id === playerId);
                  return player && player.teamId === currentSummaryTeamId;
                });
                
                if (filteredEntries.length === 0) {
                  return <Text style={styles.noStatsText}>No stats recorded for this team</Text>;
                }
                
                return filteredEntries
                .filter(([playerId, stats]) => {
                  const player = allPlayers.find(p => p.id === playerId);
                  return player && (stats.points > 0 || stats.assists > 0 || stats.offensiveRebounds > 0 || stats.defensiveRebounds > 0 || stats.steals > 0 || stats.turnovers > 0 || stats.fouls > 0);
                })
                .map(([playerId, stats]) => {
                  const player = allPlayers.find(p => p.id === playerId);
                  if (!player) return null;
                  const totalRebounds = stats.offensiveRebounds + stats.defensiveRebounds;
                  return (
                    <View key={playerId} style={styles.statRow}>
                      <View style={styles.statPlayerInfo}>
                        <View style={styles.statJerseyNumber}>
                          <Text style={styles.statJerseyText}>{player.jerseyNumber}</Text>
                        </View>
                        <Text style={styles.statPlayerName}>{player.name}</Text>
                      </View>
                      <View style={styles.statNumbers}>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{stats.points}</Text>
                          <Text style={styles.statLabelText}>PTS</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{stats.assists}</Text>
                          <Text style={styles.statLabelText}>AST</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{totalRebounds}</Text>
                          <Text style={styles.statLabelText}>REB</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{stats.steals}</Text>
                          <Text style={styles.statLabelText}>STL</Text>
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statValue}>{stats.turnovers}</Text>
                          <Text style={styles.statLabelText}>TO</Text>
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>

            <TouchableOpacity
              style={styles.endGameSummaryButton}
              onPress={async () => {
                if (!statsFinalized) {
                  setEndingGame(true);
                  try {
                    const generateUUID = () => {
                      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = Math.random() * 16 | 0;
                        const v = c === 'x' ? r : (r & 0x3 | 0x8);
                        return v.toString(16);
                      });
                    };

                    const gameId = generateUUID();
                    const now = new Date();

                    await addGame({
                      id: gameId,
                      homeTeamId: homeTeamId,
                      awayTeamId: awayTeamId,
                      homeScore,
                      awayScore,
                      quarter,
                      date: now.toISOString(),
                      location: params.eventTitle || 'Game',
                      playerGameStats: gameStats,
                      onCourt,
                      events: [],
                    });

                    if (params.eventId) {
                      const eventToUpdate = events.find(e => e.id === params.eventId);
                      if (eventToUpdate) {
                        updateEvent({
                          ...eventToUpdate,
                          gameResult: {
                            homeScore,
                            awayScore,
                            gameId,
                            playerStats: gameStats,
                            completedAt: now.toISOString(),
                          },
                        });
                        console.log('Updated event with game result:', params.eventId);
                      }
                    }

                    const realPlayers = allPlayers.filter(p => !p.teamId.startsWith('temp-opponent-'));
                    
                    for (const player of realPlayers) {
                      const playerStats = gameStats[player.id];
                      if (playerStats) {
                        const updatedPlayer: Player = {
                          ...player,
                          stats: {
                            gamesPlayed: player.stats.gamesPlayed + 1,
                            points: player.stats.points + playerStats.points,
                            assists: player.stats.assists + playerStats.assists,
                            rebounds: player.stats.rebounds + playerStats.offensiveRebounds + playerStats.defensiveRebounds,
                            offensiveRebounds: player.stats.offensiveRebounds + playerStats.offensiveRebounds,
                            defensiveRebounds: player.stats.defensiveRebounds + playerStats.defensiveRebounds,
                            steals: player.stats.steals + playerStats.steals,
                            blocks: player.stats.blocks + playerStats.blocks,
                            turnovers: player.stats.turnovers + playerStats.turnovers,
                            fouls: player.stats.fouls + playerStats.fouls,
                            fieldGoalsMade: player.stats.fieldGoalsMade + playerStats.fieldGoalsMade,
                            fieldGoalsAttempted: player.stats.fieldGoalsAttempted + playerStats.fieldGoalsAttempted,
                            threePointersMade: player.stats.threePointersMade + playerStats.threePointersMade,
                            threePointersAttempted: player.stats.threePointersAttempted + playerStats.threePointersAttempted,
                            freeThrowsMade: player.stats.freeThrowsMade + playerStats.freeThrowsMade,
                            freeThrowsAttempted: player.stats.freeThrowsAttempted + playerStats.freeThrowsAttempted,
                          },
                        };
                        await updatePlayer(updatedPlayer);
                        console.log('Updated player stats:', updatedPlayer.name, updatedPlayer.stats);
                      }
                    }

                    if (selectedTeam) {
                      const currentRecord = selectedTeam.record || '0-0';
                      const [wins, losses] = currentRecord.split('-').map(Number);
                      const isWin = homeScore > awayScore;
                      const isTie = homeScore === awayScore;
                      
                      let newWins = wins || 0;
                      let newLosses = losses || 0;
                      
                      if (isWin) {
                        newWins += 1;
                      } else if (!isTie) {
                        newLosses += 1;
                      }
                      
                      const newRecord = `${newWins}-${newLosses}`;
                      
                      const totalPoints = realPlayers.reduce((sum, player) => {
                        const stats = gameStats[player.id];
                        return sum + (stats?.points || 0);
                      }, 0);
                      
                      const gamesPlayed = newWins + newLosses;
                      const currentAvgPPG = selectedTeam.avgPPG || 0;
                      const previousGames = gamesPlayed - 1;
                      const newAvgPPG = previousGames > 0 
                        ? Math.round(((currentAvgPPG * previousGames) + totalPoints) / gamesPlayed * 10) / 10
                        : totalPoints;
                      
                      const updatedTeam = {
                        ...selectedTeam,
                        record: newRecord,
                        avgPPG: newAvgPPG,
                      };
                      
                      await updateTeam(updatedTeam);
                      console.log('Updated team record:', selectedTeam.name, newRecord, 'Avg PPG:', newAvgPPG);
                    }

                    console.log('Game ended successfully');
                    Alert.alert('Game Saved', 'All player stats and team record have been updated.', [
                      { text: 'OK', onPress: handleBackToTeamSelect }
                    ]);
                  } catch (error) {
                    console.error('Error ending game:', error);
                    Alert.alert('Error', 'Failed to save game. Please try again.');
                  } finally {
                    setEndingGame(false);
                  }
                } else {
                  router.replace('/');
                }
              }}
              disabled={endingGame}
              activeOpacity={0.7}
            >
              <Trophy size={20} color="#FFFFFF" />
              <Text style={styles.endGameSummaryButtonText}>
                {endingGame ? 'Saving...' : statsFinalized ? 'Done' : 'End Game'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  teamSelectHeader: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  teamSelectTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  teamSelectSubtitle: {
    fontSize: 16,
    color: '#888',
  },
  teamSelectScroll: {
    flex: 1,
  },
  teamSelectContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  teamSelectCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  teamSelectCardGradient: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  teamSelectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  teamSelectIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff6900',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamSelectInfo: {
    flex: 1,
    marginLeft: 16,
  },
  teamSelectName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  teamSelectDetails: {
    fontSize: 14,
    color: '#888',
  },
  teamSelectArrow: {
    padding: 8,
  },
  noTeamsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  noTeamsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noTeamsText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  noTeamsSubtext: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center' as const,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  undoText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#666',
  },
  undoTextActive: {
    color: '#ff6900',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  scoreAdjustButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreAdjustText: {
    fontSize: 20,
    fontWeight: '400' as const,
    color: '#888',
  },
  scoreDisplay: {
    alignItems: 'center',
    minWidth: 40,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  scoreLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#888',
    marginTop: 2,
  },
  quarterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  quarterText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ff6900',
  },
  teamToggle: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  teamToggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  teamToggleButtonActive: {
    backgroundColor: '#ff6900',
  },
  teamToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#888',
  },
  teamToggleTextActive: {
    color: '#FFFFFF',
  },
  addPlayerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  addPlayerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#888',
  },
  onCourtSection: {
    marginBottom: 16,
  },
  onCourtHeader: {
    marginBottom: 8,
  },
  onCourtLabel: {
    fontSize: 14,
    fontWeight: '700' as const,
    backgroundColor: '#ff6900',
    color: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  onCourtContainer: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    minHeight: 100,
    paddingVertical: 16,
    overflow: 'hidden',
  },
  noPlayersText: {
    fontSize: 14,
    color: '#666',
  },
  noPlayersHintContainer: {
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  noPlayersHint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic' as const,
  },
  onCourtScrollView: {
    flexGrow: 0,
  },
  onCourtPlayersRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  benchCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benchCircleLabel: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: '#888',
    marginTop: 2,
  },
  playerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3A3A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCircleActive: {
    backgroundColor: '#ff6900',
  },
  playerCircleNumber: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  playerCircleNumberActive: {
    color: '#FFFFFF',
  },
  selectedPlayerIndicator: {
    marginTop: 8,
  },
  selectedPlayerLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: '#ff6900',
  },
  benchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  benchHeaderText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  benchPlayersList: {
    gap: 8,
    marginBottom: 16,
  },
  benchPlayerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  benchPlayerCardActive: {
    borderWidth: 2,
    borderColor: '#ff6900',
  },
  benchPlayerNumberBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benchPlayerNumberText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  benchPlayerInfo: {
    flex: 1,
  },
  benchPlayerName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  benchPlayerStats: {
    fontSize: 12,
    color: '#888',
  },
  subInButton: {
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  subInButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  removePlayerButton: {
    padding: 8,
  },
  pointButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  pointButton: {
    flex: 1,
    backgroundColor: '#ff6900',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  pointButtonHighlight: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  pointButtonValue: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  pointButtonLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  freeThrowRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  ftMadeButton: {
    flex: 1,
    backgroundColor: '#1A3D1A',
    borderWidth: 2,
    borderColor: '#2D5A2D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ftMadeText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#4ADE80',
  },
  ftMadeSubtext: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#4ADE80',
    marginTop: 2,
  },
  ftMissButton: {
    flex: 1,
    backgroundColor: '#3D1A1A',
    borderWidth: 2,
    borderColor: '#5A2D2D',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ftMissText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#F87171',
  },
  ftMissSubtext: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#F87171',
    marginTop: 2,
  },
  statsGrid: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statButton: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  statButtonLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginTop: 8,
  },
  foulButton: {
    flex: 1,
    backgroundColor: '#2D1A1A',
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
  },
  foulButtonLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#ff6900',
    marginTop: 8,
  },
  playerStatsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  playerStatsSectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#888',
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  playerStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  playerStatCard: {
    width: 70,
    height: 80,
    backgroundColor: '#252525',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playerStatCardActive: {
    borderColor: '#ff6900',
  },
  playerStatNumber: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  playerStatNumberActive: {
    color: '#FFFFFF',
  },
  playerStatFouls: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#888',
    marginTop: 4,
  },
  playerStatFoulsActive: {
    color: '#ff6900',
  },
  endGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  endGameButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  gameSummaryOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameSummaryModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  gameSummaryHeader: {
    padding: 24,
  },
  summaryTeamToggle: {
    flexDirection: 'row',
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 20,
  },
  summaryTeamToggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  summaryTeamToggleButtonActive: {
    backgroundColor: '#ff6900',
  },
  summaryTeamToggleText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#888',
  },
  summaryTeamToggleTextActive: {
    color: '#FFFFFF',
  },
  gameSummaryTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 20,
  },
  finalScoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  finalTeamScore: {
    alignItems: 'center',
  },
  finalTeamName: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  finalScore: {
    fontSize: 48,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  winningScore: {
    color: '#22C55E',
  },
  scoreDivider: {
    fontSize: 24,
    color: '#666',
  },
  gameSummaryContent: {
    padding: 20,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statRow: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statJerseyNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statJerseyText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  statPlayerName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  statNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#ff6900',
    marginBottom: 2,
  },
  statLabelText: {
    fontSize: 11,
    color: '#888',
  },
  noStatsText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center' as const,
    paddingVertical: 24,
  },
  endGameSummaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 20,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
  },
  endGameSummaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  actionModalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  actionModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center' as const,
    marginBottom: 24,
  },
  actionModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionModalButtonMade: {
    flex: 1,
    backgroundColor: '#22C55E',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionModalButtonMissed: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionModalButtonOffensive: {
    flex: 1,
    backgroundColor: '#ff6900',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionModalButtonDefensive: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionModalButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  actionModalCancel: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionModalCancelText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#888',
  },
  playerStatsModalOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  playerStatsModal: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  playerStatsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playerStatsModalTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  playerStatsModalClose: {
    borderWidth: 2,
    borderColor: '#ff6900',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  playerStatsModalCloseText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#ff6900',
  },
  playerStatsModalContent: {
    padding: 24,
  },
  playerStatsModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  playerStatsModalLabel: {
    fontSize: 18,
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  playerStatsModalLabelHighlight: {
    color: '#ff6900',
  },
  playerStatsModalControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playerStatsModalButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerStatsModalButtonPlus: {
    backgroundColor: '#333',
  },
  playerStatsModalButtonText: {
    fontSize: 24,
    fontWeight: '500' as const,
    color: '#888',
  },
  playerStatsModalButtonTextPlus: {
    color: '#ff6900',
  },
  playerStatsModalValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    minWidth: 50,
    textAlign: 'center' as const,
  },
});
