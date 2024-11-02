import React from "react";
import { StyleSheet, View ,Button} from "react-native";
import { useEffect } from "react";
export default function HomeScreen({navigation}:{navigation:any}) {
  useEffect(() => {
  }, []);
  return (
    <View style={styles.root}>
      <Button
        onPress={() => {
          console.log("button clicked!");
          navigation.navigate('Grocerlist');
        }}
        title="ahoy"
      />
      <Button
        onPress={() => {
          console.log("button clicked!");
          navigation.navigate('Grocersee');
        }}
        title="ahay"
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