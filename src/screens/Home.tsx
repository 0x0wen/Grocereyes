import React from "react";
import { StyleSheet, View } from "react-native";
import { useEffect } from "react";
import Button from "../components/Button";

export default function HomeScreen({navigation}:{navigation:any}) {
  useEffect(() => {
  }, []);
  return (
    <View style={styles.root}>
      <Button
        onPress={() => {
          console.log("button clicked!");
          navigation.navigate('Grocersee');
        }}
        speech="Minggir lu miskin"
        style={{button:styles.button}}
        icon={{ name: "camera", size: 240 }}
      />
      <Button
        onPress={() => {
          console.log("button clicked!");
          navigation.navigate('Grocerlist');
        }}
        speech="Minggir lu miskin"
        style={{button:styles.button}}
        icon={{ name: "shoppingcart", size: 240 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 20,
    gap: 20,
    backgroundColor: "#FFFFFF",
  },
  button: {
    flex: 1, // Each button takes half of the container width
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6200ee", // Background color for the button
    padding: 20,
    borderRadius: 20,
  },
});