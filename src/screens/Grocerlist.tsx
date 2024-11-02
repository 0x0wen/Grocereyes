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
  name: string;
  status: boolean;
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

  const getNextAudioNumber = (audios: RecordedAudio[]): number => {
    if (audios.length === 0) return 1;
    
    const numbers = audios
      .map(audio => {
        const match = audio.name.match(/Belanjaan (\d+)/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => !isNaN(num));
    
    return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
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
        setRecordedAudios((prevAudios) => {
          const nextNumber = getNextAudioNumber(prevAudios);
          const newAudio: RecordedAudio = {
            id: Date.now().toString(),
            uri,
            done: false,
            name: `Belanjaan ${nextNumber}`,
            status: false,
          };
          return [newAudio,...prevAudios ];
        });
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

  const handleTripleClick = (id: string) => {
    setRecordedAudios((prevAudios) => 
      prevAudios.map((audio) => 
        audio.id === id 
          ? { ...audio, status: !audio.status }  // Toggle status
          : audio
      )
    );
    console.log("Audio button clicked three times!");
  };
  return (
    <View style={styles.container}>
    <Button icon={{name:'plus',size:50}} onDoubleClick={startRecording} style={{button: styles.addButton, icon: {color:'#000000'}}} onSingleClick={()=>speak('Tambahkan belanjaan')} onTripleClick={()=>console.log("Clicked three times!")}/>
      <FlatList
        data={recordedAudios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Button 
            onSingleClick={()=>speak(item.status ? item.name + ' sudah dibeli.' : item.name)}
            onDoubleClick={()=> {playAudio(item.uri);console.log("Audio button clicked two times!")}}
            onTripleClick={() => handleTripleClick(item.id)}
            icon={{name:'plus',size:50}}  
            style={{button: {...styles.audioCard, backgroundColor: item.status ? '#00FF2F' : '#D2D2D2'}, icon: {color:'#000000'}}}  />
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
      <Button onTripleClick={()=>console.log('Button is clicked three times!')} onDoubleClick={()=>console.log('Button is clicked twice!')} icon={{name:'question', size:40}} style={{button:{backgroundColor:'#000000', position:'absolute',bottom:30,right:30, padding:20, borderRadius:100}}} onSingleClick={()=>speak('Anda dapat menekan tombol di atas untuk menambahkan audio. Setiap audio yang terekam ditampilkan dari atas ke bawah, tepat di bawah tombol menambahkan audio. Ketuk dua kali untuk memainkan audio, dan ketuk tiga kali untuk menandai belanjaan sudah dibeli pada salah satu audio.')}/>
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