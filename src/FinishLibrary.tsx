import React, { useState } from "react";
import {
  Image,
  Pressable,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { finishes } from "./materials";
import { Chips, Icon, Label, T, Title, color, s } from "./ui";
export type Finish = (typeof finishes)[number];
export function Tile({
  finish,
  choose,
  width,
}: {
  finish: Finish;
  choose: () => void;
  width: number | `${number}%`;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={"Use " + finish.name + " MRK-" + finish.id}
      onPress={choose}
      style={({ pressed }) => [{ width, gap: 6 }, pressed && { opacity: 0.75 }]}
    >
      <View
        style={{
          width: "100%",
          aspectRatio: 1.6,
          borderRadius: 5,
          overflow: "hidden",
          backgroundColor: finish.color,
        }}
      >
        <Image
          source={finish.image}
          resizeMode="cover"
          style={{ position: "absolute", width: "100%", height: "100%" }}
        />
      </View>
      <T style={{ fontFamily: "DMBold", fontSize: 14 }}>{finish.name}</T>
      <T style={{ fontSize: 11, color: color.muted, letterSpacing: 0.6 }}>
        MRK-{finish.id}
      </T>
    </Pressable>
  );
}
export function Materials({ choose }: { choose: (f: Finish) => void }) {
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("All");
  const wide = useWindowDimensions().width >= 740;
  const found = finishes.filter(
    (f) =>
      (group === "All" || group === f.group) &&
      (f.name + " MRK-" + f.id)
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 5 }}>
        <Label>MERAKI PVC LAMINATES</Label>
        <Title>Material library</Title>
        <T style={s.sub}>Choose a finish to apply it to your wardrobe.</T>
      </View>
      <View style={[s.input, s.row]}>
        <Icon name="search" />
        <TextInput
          accessibilityLabel="Search finishes"
          placeholder="Search by finish or product code"
          value={query}
          onChangeText={setQuery}
          style={{
            flex: 1,
            paddingVertical: 12,
            fontFamily: "DMSans",
            fontSize: 15,
          }}
        />
      </View>
      <Chips
        values={["All", "Wood", "Radiant"]}
        selected={group}
        select={setGroup}
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          columnGap: "2%",
          rowGap: 20,
        }}
      >
        {found.map((f) => (
          <Tile
            key={f.id}
            finish={f}
            width={wide ? "23%" : "49%"}
            choose={() => choose(f)}
          />
        ))}
      </View>
      {!found.length && (
        <T style={s.sub}>No matching finishes. Try another name or MRK code.</T>
      )}
    </View>
  );
}
