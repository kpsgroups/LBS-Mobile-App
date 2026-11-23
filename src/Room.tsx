import React from "react";
import { View } from "react-native";
import { Button, T, s } from "./ui";
import { Preview } from "./Preview";
import type { Design } from "./model";

export default function Room({
  design,
  close,
}: {
  design: Design;
  close: () => void;
}) {
  return (
    <View style={s.section}>
      <Preview design={design} />
      <T style={s.h2}>View in your room</T>
      <T style={s.sub}>
        Open the LBS iOS or Android development build on a phone with AR support
        to place this wardrobe at full size.
      </T>
      <Button onPress={close} secondary>
        Back to design
      </Button>
    </View>
  );
}
