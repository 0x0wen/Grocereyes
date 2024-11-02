import React, { ReactNode } from "react";
import { Text, StyleSheet, TouchableOpacity } from "react-native";
import { speak, haptic } from "../helpers/accessibility";
import { AntDesign } from "@expo/vector-icons";
import { useEffect,useRef ,useState} from "react";

export default function Button({
  onSingleClick,
  onDoubleClick,
  onTripleClick,
  maxDelay = 500,
  style,
  icon,
}: {
  onSingleClick: () => void;
  onDoubleClick: () => void;
  onTripleClick: () => void;
  maxDelay?: number;
  style?: any;
  icon: any;
}) {
  const [clicks, setClicks] = useState<number[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePress = () => {
    haptic();
    const now = Date.now();
    
    // Add new click timestamp
    setClicks((prevClicks:any) => {
      const newClicks = [...prevClicks, now];
      
      // Only keep clicks within the maxDelay window
      const validClicks = newClicks.filter(click => now - click <= maxDelay);
      
      // Process clicks
      if (validClicks.length === 1) {
        // Start timer for single click
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          onSingleClick?.();
          setClicks([]);
        }, maxDelay);
      } 
      else if (validClicks.length === 2) {
        // Clear single click timer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        // Check if double click is within threshold
        if (validClicks[1] - validClicks[0] <= maxDelay) {
          timeoutRef.current = setTimeout(() => {
            onDoubleClick?.();
            setClicks([]);
          }, maxDelay / 2);
        } else {
          // Reset if clicks are too far apart
          return [now];
        }
      }
      else if (validClicks.length === 3) {
        // Clear any existing timer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        // Check if triple click is within threshold
        if (validClicks[2] - validClicks[0] <= maxDelay) {
          onTripleClick?.();
          return [];
        } else {
          // Reset if clicks are too far apart
          return [now];
        }
      }
      
      return validClicks;
    });
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TouchableOpacity style={ style.button } onPress={handlePress}>
      <AntDesign
        name={icon.name}
        size={icon.size}
        color="white"
        style={style?.icon}
      />
    </TouchableOpacity>
  );
}