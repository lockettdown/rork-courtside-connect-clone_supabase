import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Calendar, Clock } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { useApp } from '@/contexts/AppContext';

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DateTimePickerModule = require('@react-native-community/datetimepicker');
  DateTimePicker = DateTimePickerModule.default;
}

interface AddEventModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (eventData: {
    type: 'game' | 'practice' | 'tournament';
    title: string;
    teamId: string;
    teamName: string;
    date: string;
    time: string;
    location: string;
    opponent?: string;
  }) => void;
}

export default function AddEventModal({ visible, onClose, onSave }: AddEventModalProps) {
  const { teams } = useApp();
  const [eventType, setEventType] = useState<'game' | 'practice' | 'tournament'>('game');
  const [title, setTitle] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id || '');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [opponent, setOpponent] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());

  const handleSave = () => {
    if (title.trim() && selectedTeamId && date.trim() && time.trim() && location.trim()) {
      const selectedTeam = teams.find(t => t.id === selectedTeamId);
      onSave({
        type: eventType,
        title: title.trim(),
        teamId: selectedTeamId,
        teamName: selectedTeam?.name || '',
        date: date.trim(),
        time: time.trim(),
        location: location.trim(),
        opponent: opponent.trim() || undefined,
      });
      resetForm();
      onClose();
    }
  };

  const resetForm = () => {
    setEventType('game');
    setTitle('');
    setSelectedTeamId(teams[0]?.id || '');
    setDate('');
    setTime('');
    setLocation('');
    setOpponent('');
    setSelectedDate(new Date());
    setSelectedTime(new Date());
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  const formatDate = (date: Date): string => {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const formatTime = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleDateChange = (event: any, selectedValue?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set' && selectedValue) {
      setSelectedDate(selectedValue);
      setDate(formatDate(selectedValue));
    }
  };

  const handleTimeChange = (event: any, selectedValue?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedValue) {
      setSelectedTime(selectedValue);
      setTime(formatTime(selectedValue));
    }
  };

  const confirmDateSelection = () => {
    setDate(formatDate(selectedDate));
    setShowDatePicker(false);
  };

  const confirmTimeSelection = () => {
    setTime(formatTime(selectedTime));
    setShowTimePicker(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Event</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.pickerButtonText, !date && styles.placeholderText]}>
                {date || 'MM/DD/YYYY'}
              </Text>
              <Calendar size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showDatePicker && Platform.OS !== 'web' && DateTimePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                textColor={theme.colors.text}
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.confirmButton} onPress={confirmDateSelection}>
                  <Text style={styles.confirmButtonText}>Confirm Date</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showDatePicker && Platform.OS === 'web' && (
            <View style={styles.webPickerContainer}>
              <TextInput
                style={styles.input}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={theme.colors.textSecondary}
                value={date}
                onChangeText={(text) => {
                  setDate(text);
                }}
                autoFocus
              />
              <TouchableOpacity style={styles.confirmButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={[styles.pickerButtonText, !time && styles.placeholderText]}>
                {time || 'HH:MM AM/PM'}
              </Text>
              <Clock size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showTimePicker && Platform.OS !== 'web' && DateTimePicker && (
            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTimeChange}
                textColor={theme.colors.text}
                themeVariant="dark"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity style={styles.confirmButton} onPress={confirmTimeSelection}>
                  <Text style={styles.confirmButtonText}>Confirm Time</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showTimePicker && Platform.OS === 'web' && (
            <View style={styles.webPickerContainer}>
              <TextInput
                style={styles.input}
                placeholder="HH:MM AM/PM (e.g., 3:30 PM)"
                placeholderTextColor={theme.colors.textSecondary}
                value={time}
                onChangeText={(text) => {
                  setTime(text);
                }}
                autoFocus
              />
              <TouchableOpacity style={styles.confirmButton} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.confirmButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}

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
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.saveButton} 
            onPress={handleSave}
            activeOpacity={0.8}
          >
            <Text style={styles.saveButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
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
  pickerButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
  },
  placeholderText: {
    color: theme.colors.textSecondary,
  },
  pickerContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  webPickerContainer: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.text,
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
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  saveButton: {
    backgroundColor: '#FF6900',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.text,
  },
});
