import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,Image
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Button from '../components/Button';
import { speak } from '../helpers/accessibility';

interface RecordedAudio {
  id: string;
  uri: string;
  done:boolean;
}

const Grocerlist: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordedAudios, setRecordedAudios] = useState<RecordedAudio[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) return;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
      );
      setRecording(recording);
      setIsRecording(true);
      setModalVisible(true);
    } catch (error) {
      console.error('Failed to start recording', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recording) return;
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
      await recording.stopAndUnloadAsync();

      const uri = recording.getURI();
      if (uri) {
        const newAudio: RecordedAudio = { id: Date.now().toString(), uri ,done:false};
        setRecordedAudios((prevAudios) => [...prevAudios, newAudio]);
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
    } finally {
      setRecording(null);
      setIsRecording(false);
      setModalVisible(false);
    }
  };

  const playAudio = async (uri: string) => {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  };

  const handleModalClose = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  return (
    <View style={styles.container}>
    <Button icon={{name:'plus',size:50}} onDoubleClick={startRecording} style={{button: styles.addButton, icon: {color:'#000000'}}} onSingleClick={()=>speak('Tambahkan belanjaan')} onTripleClick={()=>console.log("Clicked three times!")}/>
      <FlatList
        data={recordedAudios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.audioCard}
            onPress={() => playAudio(item.uri)}
          >
            <Text style={styles.audioText}>Audio {item.id}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContainer}
      />

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleModalClose}
      >
        <TouchableOpacity
          style={styles.modalContainer}
          onPress={handleModalClose}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              {isRecording ? 'Recording...' : 'Stopped'}
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>
      <Button onTripleClick={()=>console.log('Button is clicked three times!')} onDoubleClick={()=>console.log('Button is clicked twice!')} icon={{name:'question', size:40}} style={{button:{backgroundColor:'#000000', position:'absolute',bottom:30,right:30, padding:20, borderRadius:100}}} onSingleClick={()=>speak('Anda dapat menekan tombol di atas untuk menambahkan audio. Setiap audio yang terekam ditampilkan dari atas ke bawah, tepat di bawah tombol menambahkan audio. Anda dapat memainkan audio dengan menekan salah satu dari daftar audio yang ditampilkan.')}/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  addButton: {
    borderColor: '#D2D2D2',
    borderWidth: 2,
    borderStyle: 'dashed',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 20,
  },
  audioCard: {
    backgroundColor: '#D2D2D2',
    padding: 20,
    borderRadius: 8,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  audioText: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  modalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#6200ee',
  },
});

export default Grocerlist;