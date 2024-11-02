import { ReactNode } from "react";
import { Text, StyleSheet, Pressable } from "react-native";
import { speak, haptic } from "../helpers/accessibility";
import { AntDesign } from "@expo/vector-icons";
import React = require("react");

export default function Button({
  onPress,
  speech,
  style,
  icon,
}: {
  onPress: () => void;
  speech: string;
  style?: any;
  icon: any;
}) {
  function handlePress() {
    haptic();
    if (speech) {
      speak(speech);
    }
    onPress();
  }
  return (
    <Pressable style={ style.button } onPress={handlePress}>
      <AntDesign
        name={icon.name}
        size={icon.size}
        color="white"
        style={style?.icon}
      />
    </Pressable>
  );
}