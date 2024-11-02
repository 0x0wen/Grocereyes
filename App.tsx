import React = require("react");
import { StyleSheet, Platform, View } from "react-native";
import Button from "./(components)/Button";
import { useEffect } from "react";
import { speak } from "./helpers/accessibility";
import { Link, router } from "expo-router";
export default function HomeScreen() {
  useEffect(() => {
    speak('Aplikasi ini membantu tunanetra berbelanja lebih mudah dengan fitur pendeteksian barang lewat kamera dan pembuatan daftar belanja via suara.')
    speak('Tekan area atas handphone untuk membuka kamera pendeteksi dan tekan area bawah handphone anda untuk membuat daftar belanja.')
  }, []);
  return (
    <View style={styles.root}>
      <Button
        onPress={() => {
          console.log("button clicked!");
          router.push("/grocersee");
        }}
        speech="Minggir lu miskin"
        style={{button:styles.button}}
        icon={{ name: "camera", size: 240 }}
      />
      <Button
        onPress={() => {
          console.log("button clicked!");
          router.push("/grocerlist");
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