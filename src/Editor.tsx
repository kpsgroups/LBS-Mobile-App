import React, { useState } from "react";
import {
  Image,
  Pressable,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { finishById } from "./materials";
import { limits, type Design } from "./model";
import { Preview } from "./Preview";
import { Button, Chips, Icon, Label, T, Title, color, s } from "./ui";

interface Props {
  design: Design;
  change: (d: Design) => void;
  name: string;
  setName: (v: string) => void;
  estimate: string;
  setEstimate: (v: string) => void;
  materials: () => void;
  room: () => void;
  save: () => void;
  busy: boolean;
  error: string;
}
const dimensions = ["width", "height", "depth"] as const;
export function Editor(p: Props) {
  const [view, setView] = useState("Exterior"),
    [angle, setAngle] = useState(24);
  const wide = useWindowDimensions().width >= 800;
  const f = finishById(p.design.finish);
  return (
    <View style={{ gap: 20 }}>
      <View>
        <Label>WARDROBE CONFIGURATOR</Label>
        <Title>Studio wardrobe</Title>
      </View>
      <View
        style={{
          flexDirection: wide ? "row" : "column",
          gap: 24,
          alignItems: "stretch",
        }}
      >
        <View style={{ flex: wide ? 1 : undefined, gap: 14 }}>
          <Preview design={p.design} angle={angle} open={view === "Interior"} />
          <View style={s.between}>
            <Chips
              values={["Exterior", "Interior"]}
              selected={view}
              select={setView}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Rotate wardrobe preview"
              onPress={() =>
                setAngle((a) => (a === 24 ? 0 : a === 0 ? -28 : 24))
              }
              style={{ padding: 10 }}
            >
              <Icon name="rotate" />
            </Pressable>
          </View>
          <Button icon="camera" secondary onPress={p.room}>
            View in room
          </Button>
        </View>
        <View style={{ flex: wide ? 1 : undefined, gap: 20 }}>
          <View style={s.section}>
            <T style={s.h3}>Dimensions</T>
            {dimensions.map((field) => {
              const [min, max, step] = limits[field],
                value = p.design[field];
              return (
                <View key={field} style={s.between}>
                  <T style={{ textTransform: "capitalize" }}>{field}</T>
                  <View style={[s.row, { gap: 0 }]}>
                    {([-1, 1] as const).map((dir) => {
                      const isMin = dir === -1,
                        off = isMin ? value <= min : value >= max;
                      return (
                        <React.Fragment key={dir}>
                          {!isMin && (
                            <T
                              style={{
                                minWidth: 82,
                                textAlign: "center",
                                fontFamily: "DMBold",
                              }}
                            >
                              {value} mm
                            </T>
                          )}
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={
                              (isMin ? "Decrease " : "Increase ") + field
                            }
                            disabled={off}
                            onPress={() =>
                              p.change({
                                ...p.design,
                                [field]: value + dir * step,
                              })
                            }
                            style={{
                              minWidth: 42,
                              minHeight: 42,
                              alignItems: "center",
                              justifyContent: "center",
                              borderWidth: 1,
                              borderColor: color.line,
                              borderRadius: 5,
                              opacity: off ? 0.3 : 1,
                            }}
                          >
                            <Icon name={isMin ? "minus" : "plus"} size={15} />
                          </Pressable>
                        </React.Fragment>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
          <View style={s.line} />
          <View style={s.section}>
            <T style={s.h3}>Doors & compartments</T>
            <Chips
              label="Door count"
              values={[2, 3, 4]}
              selected={p.design.bays}
              select={(bays) => p.change({ ...p.design, bays })}
            />
            <T style={s.sub}>Interior layout</T>
            <Chips
              values={["Mixed", "Shelves", "Hanging"] as const}
              selected={p.design.layout}
              select={(layout) => {
                p.change({ ...p.design, layout });
                setView("Interior");
              }}
            />
          </View>
          <Pressable
            onPress={p.materials}
            accessibilityRole="button"
            accessibilityLabel="Change laminate finish"
            style={[s.between, s.block, { flexDirection: "row" }]}
          >
            <Image
              source={f.image}
              style={{ height: 50, width: 50, borderRadius: 4 }}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <Label>LAMINATE FINISH</Label>
              <T>
                {f.name} · MRK-{f.id}
              </T>
            </View>
            <Icon name="arrow" />
          </Pressable>
        </View>
      </View>
      <View style={s.line} />
      <View style={s.section}>
        <T style={s.h2}>Project details</T>
        <T>Project name</T>
        <TextInput
          accessibilityLabel="Project name"
          value={p.name}
          onChangeText={p.setName}
          maxLength={100}
          placeholder="e.g. Guest bedroom"
          style={s.input}
        />
        <T>Estimate with currency (optional)</T>
        <TextInput
          accessibilityLabel="Estimate with currency"
          value={p.estimate}
          onChangeText={p.setEstimate}
          maxLength={80}
          placeholder="Enter your estimate"
          style={s.input}
        />
        {!!p.error && (
          <T accessibilityRole="alert" style={{ color: "#883e2c" }}>
            {p.error}
          </T>
        )}
        <Button icon="projects" onPress={p.save} disabled={p.busy}>
          {p.busy ? "Saving…" : "Save project"}
        </Button>
      </View>
    </View>
  );
}
