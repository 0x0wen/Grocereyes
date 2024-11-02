import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";

export function speak(sentence: string) {
  return Speech.speak(sentence, { language: "id" });
}

export function haptic() {
  return Haptics.notificationAsync();
}