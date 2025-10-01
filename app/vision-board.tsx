import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Alert,
  Platform,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import GradientBackground from '@/components/ui/GradientBackground';
import SacredButton from '@/components/ui/SacredButton';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useVisionBoard } from '@/hooks/useIndividualCocriations';
import { Spacing } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

export default function VisionBoardScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { cocreationId } = useLocalSearchParams<{ cocreationId: string }>();
  
  const { items, loading, addItem, refresh } = useVisionBoard(cocreationId || '');

  const [elements, setElements] = useState<any[]>([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showEmojiModal, setShowEmojiModal] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isDirty, setIsDirty] = useState(false); // Track changes

  useEffect(() => {
    // Load existing items from useVisionBoard
    if (items.length > 0) {
      setElements(items);
    }
  }, [items]);

  const showWebAlert = (title: string, message: string, onOk?: () => void, onCancel?: () => void) => {
    if (Platform.OS === 'web') {
      const result = confirm(`${title}: ${message}`);
      if (result && onOk) onOk();
      else if (!result && onCancel) onCancel();
    } else {
      Alert.alert(
        title,
        message,
        [
          { text: 'Cancelar', style: 'cancel', onPress: onCancel },
          { text: 'Sair', onPress: onOk },
        ]
      );
    }
  };

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showWebAlert('Permissão Necessária', 'Precisamos de permissão para acessar suas fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newElement = {
        id: Date.now(),
        type: 'image',
        content: result.assets[0].uri,
        x: Math.random() * (width - 100),
        y: Math.random() * (height - 300),
      };
      setElements(prev => [...prev, newElement]);
      setIsDirty(true);
    }
  };

  const handleAddText = () => {
    setCustomText('');
    setShowTextModal(true);
  };

  const handleConfirmText = () => {
    if (customText.trim()) {
      const newElement = {
        id: Date.now(),
        type: 'text',
        content: customText,
        x: Math.random() * (width - 100),
        y: Math.random() * (height - 300),
      };
      setElements(prev => [...prev, newElement]);
      setIsDirty(true);
    }
    setShowTextModal(false);
  };

  const handleAddEmoji = () => {
    setShowEmojiModal(true);
  };

  const handleSelectEmoji = (emoji: string) => {
    const newElement = {
      id: Date.now(),
      type: 'emoji',
      content: emoji,
      x: Math.random() * (width - 100),
      y: Math.random() * (height - 300),
    };
    setElements(prev => [...prev, newElement]);
    setIsDirty(true);
    setShowEmojiModal(false);
  };

  const handleFinish = () => {
    // Save all elements to backend
    elements.forEach(item => {
      addItem({
        type: item.type,
        content: item.content,
        position_x: item.x || 0,
        position_y: item.y || 0,
      });
    });
    router.push('/(tabs)/individual');
  };

  const handleBack = () => {
    if (isDirty) {
      showWebAlert(
        'Sair sem salvar?',
        'Seu Vision Board ainda não foi salvo. Deseja sair mesmo assim?',
        () => router.back(), // Confirm
        () => {} // Cancel
      );
    } else {
      router.back();
    }
  };

  const emojis = ['✨', '🌟', '💖', '🙏', '🌈', '💫', '🔮', '🦋', '🌸', '💎', '🕊️', '🕯️', '🌙', '🔮', '🪷', 'ॐ'];

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior="padding" style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Vision Board Area */}
        <ScrollView contentContainerStyle={styles.boardArea}>
          {elements.map((item) => (
            <Animated.View
              key={item.id}
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={[
                styles.element,
                { left: item.x, top: item.y },
              ]}
            >
              {item.type === 'image' && (
                <Image source={{ uri: item.content }} style={styles.imageElement} contentFit="cover" />
              )}
              {item.type === 'text' && (
                <Text style={styles.textElement}>{item.content}</Text>
              )}
              {item.type === 'emoji' && (
                <Text style={styles.emojiElement}>{item.content}</Text>
              )}
            </Animated.View>
          ))}

          {elements.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="dashboard" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyStateText, { color: colors.text }]}>
                Crie seu espaço de cocriação
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: colors.textMuted }]}>
                Adicione imagens, textos ou símbolos que representem sua intenção
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Floating Toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolButton} onPress={handleAddImage}>
            <MaterialIcons name="add-photo-alternate" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleAddText}>
            <MaterialIcons name="text-fields" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolButton} onPress={handleAddEmoji}>
            <MaterialIcons name="mood" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Finish Button */}
        <SacredButton
          title="Salvar Vision Board"
          onPress={handleFinish}
          style={styles.finishButton}
        />

        {/* Text Modal */}
        <Modal visible={showTextModal} transparent={true} animationType="fade">
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Digite seu texto"
                  placeholderTextColor={colors.textMuted}
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity onPress={() => setShowTextModal(false)}>
                    <Text style={[styles.modalCancel, { color: colors.textMuted }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleConfirmText}>
                    <Text style={[styles.modalConfirm, { color: colors.primary }]}>Adicionar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Emoji Picker Modal */}
        <Modal visible={showEmojiModal} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Selecione um símbolo</Text>
              <View style={styles.emojiGrid}>
                {emojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleSelectEmoji(emoji)}
                    style={styles.emojiButton}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setShowEmojiModal(false)} style={styles.closeButton}>
                <Text style={[styles.closeText, { color: colors.text }]}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  boardArea: {
    flex: 1,
    position: 'relative',
    minHeight: height * 0.7,
  },
  element: {
    position: 'absolute',
    borderRadius: 8,
  },
  imageElement: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  textElement: {
    fontSize: 16,
    fontWeight: '600',
    padding: 10,
    color: '#fff',
    backgroundColor: 'rgba(126, 92, 239, 0.7)',
    borderRadius: 8,
  },
  emojiElement: {
    fontSize: 32,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  toolButton: {
    padding: Spacing.md,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  finishButton: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 10,
    zIndex: 100,
    padding: Spacing.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: Spacing.md,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: Spacing.lg,
    borderRadius: 16,
  },
  textInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.lg,
  },
  modalCancel: {
    fontSize: 16,
  },
  modalConfirm: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: Spacing.lg,
  },
  emojiButton: {
    padding: Spacing.md,
  },
  emojiText: {
    fontSize: 32,
  },
  closeButton: {
    alignItems: 'center',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
});