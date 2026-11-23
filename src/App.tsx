import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { InstrumentSerif_400Regular } from "@expo-google-fonts/instrument-serif/400Regular";
import { DMSans_400Regular } from "@expo-google-fonts/dm-sans/400Regular";
import { DMSans_600SemiBold } from "@expo-google-fonts/dm-sans/600SemiBold";
import { Materials, Tile, type Finish } from "./FinishLibrary";
import { finishes, finishById } from "./materials";
import { initialDesign } from "./model";
import { Editor } from "./Editor";
import { readProjects, saveProject, type Project } from "./projects";
import Room from "./Room";
import { Button, Icon, Label, T, Title, color, s, type IconName } from "./ui";

type Page =
  | "Studio"
  | "Materials"
  | "Projects"
  | "Editor"
  | "Room"
  | "Specification";
const tabs = ["Studio", "Materials", "Projects"] as const;
const icons: Record<(typeof tabs)[number], IconName> = {
  Studio: "studio",
  Materials: "materials",
  Projects: "projects",
};
const featured = [finishes[0], finishes[4], finishById(9018), finishById(9033)];
function spec(p: Project) {
  const d = p.design,
    f = finishById(d.finish);
  return [
    "LBS Interior Studio",
    p.name,
    "Studio wardrobe",
    `Width ${d.width} mm × height ${d.height} mm × depth ${d.depth} mm`,
    `${d.bays} hinged doors · ${d.layout} layout`,
    `Meraki PVC laminate · ${f.name} · MRK-${f.id}`,
    p.estimate ? "Estimate: " + p.estimate : "Estimate pending",
  ].join("\n");
}
function StudioApp() {
  const wide = useWindowDimensions().width >= 740;
  const [page, setPage] = useState<Page>("Studio"),
    [design, setDesign] = useState(initialDesign);
  const [name, setName] = useState(""),
    [estimate, setEstimate] = useState(""),
    [id, setId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]),
    [readError, setReadError] = useState(false);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [shareError, setShareError] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const saving = useRef(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [page]);
  useEffect(() => {
    let active = true;
    readProjects()
      .then((list) => {
        if (active) setProjects(list);
      })
      .catch(() => {
        if (active) setReadError(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function edit(p?: Project) {
    setId(p?.id ?? null);
    setName(p?.name ?? "");
    setEstimate(p?.estimate ?? "");
    setDesign(p?.design ?? initialDesign);
    setError("");
    setPage("Editor");
  }
  function choose(f: Finish) {
    setDesign((d) => ({ ...d, finish: f.id }));
    setPage("Editor");
  }
  async function save() {
    if (saving.current) return;
    if (!name.trim()) {
      setError("Enter a project name to save your design.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    const project: Project = {
      id:
        id ??
        Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      estimate: estimate.trim(),
      updated: new Date().toISOString(),
      design: { ...design },
    };
    try {
      const next = await saveProject(project);
      setProjects(next);
      setReadError(false);
      setId(project.id);
      setSelected(project);
      setShareError(false);
      setPage("Specification");
    } catch {
      setError(
        "The project could not be saved on this device. Your design is still open.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  const activeTab =
    page === "Editor" || page === "Room"
      ? "Studio"
      : page === "Specification"
        ? "Projects"
        : page;
  const nav = (
    <View
      style={{
        flexDirection: "row",
        gap: wide ? 12 : 0,
        justifyContent: "space-around",
      }}
    >
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          accessibilityRole="button"
          accessibilityState={{ selected: activeTab === tab }}
          onPress={() => setPage(tab)}
          style={{
            flex: wide ? undefined : 1,
            flexDirection: wide ? "row" : "column",
            paddingHorizontal: 12,
            paddingVertical: wide ? 10 : 7,
            alignItems: "center",
            justifyContent: "center",
            gap: wide ? 7 : 2,
            borderRadius: 6,
            backgroundColor:
              wide && activeTab === tab ? "#e9eadd" : "transparent",
          }}
        >
          <Icon
            name={icons[tab]}
            size={wide ? 16 : 19}
            tint={activeTab === tab ? color.sage : color.muted}
          />
          <T
            style={{
              fontSize: wide ? 14 : 11,
              fontFamily: activeTab === tab ? "DMBold" : "DMSans",
              color: activeTab === tab ? color.ink : color.muted,
            }}
          >
            {tab}
          </T>
        </Pressable>
      ))}
    </View>
  );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: color.paper }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ borderBottomWidth: 1, borderColor: color.line }}>
        <View
          style={[
            s.between,
            {
              width: "100%",
              maxWidth: 1120,
              alignSelf: "center",
              paddingHorizontal: wide ? 34 : 20,
              paddingVertical: 12,
            },
          ]}
        >
          <View style={[s.row, { gap: 12 }]}>
            <T
              style={{
                fontFamily: "Instrument",
                fontSize: 37,
                lineHeight: 41,
                letterSpacing: -2,
              }}
            >
              LBS
            </T>
            <View
              style={{ width: 1, height: 24, backgroundColor: "#b9b8ac" }}
            />
            <T
              style={{
                fontFamily: "DMBold",
                fontSize: 10,
                lineHeight: 13,
                letterSpacing: 1.1,
              }}
            >
              INTERIOR{"\n"}STUDIO
            </T>
          </View>
          {wide ? nav : <Icon name="studio" size={22} tint={color.sage} />}
        </View>
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ alignItems: "center", paddingBottom: 34 }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 1120,
            gap: 24,
            paddingHorizontal: wide ? 34 : 20,
            paddingTop: wide ? 30 : 24,
          }}
        >
          {page === "Studio" && (
            <>
              <Title>Design studio</Title>
              <View
                style={{
                  flexDirection: wide ? "row" : "column",
                  borderRadius: 10,
                  overflow: "hidden",
                  backgroundColor: "#eae4d6",
                }}
              >
                <View
                  style={{ width: wide ? "58%" : "100%", aspectRatio: 1.5 }}
                >
                  <Image
                    source={require("../assets/studio-wardrobe.jpg")}
                    resizeMode="cover"
                    accessibilityLabel="Studio wardrobe in honey oak beside a stone bench"
                    style={{
                      width: "100%",
                      height: "100%",
                      position: "absolute",
                    }}
                  />
                </View>
                <View
                  style={{
                    flex: 1,
                    padding: wide ? 30 : 20,
                    justifyContent: "center",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <Label>FURNITURE COLLECTION</Label>
                  <T
                    style={{
                      fontFamily: "Instrument",
                      fontSize: wide ? 50 : 38,
                      lineHeight: wide ? 54 : 42,
                    }}
                  >
                    Studio wardrobe
                  </T>
                  <T style={[s.sub, { maxWidth: 330 }]}>
                    A full-height wardrobe with hinged doors, adjustable bays
                    and your choice of laminate.
                  </T>
                  <Button onPress={() => setPage("Editor")} icon="arrow">
                    {id ? "Continue design" : "Configure wardrobe"}
                  </Button>
                </View>
              </View>
              <View style={s.between}>
                <View style={{ gap: 3 }}>
                  <Label>MERAKI PVC LAMINATES</Label>
                  <T style={s.h2}>Material library</T>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setPage("Materials")}
                  style={[s.row, { paddingVertical: 10 }]}
                >
                  <T style={{ fontSize: 13 }}>View all</T>
                  <Icon name="arrow" size={17} />
                </Pressable>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  rowGap: 18,
                }}
              >
                {featured.map((f) => (
                  <Tile
                    key={f.id}
                    finish={f}
                    width={wide ? "23.5%" : "48%"}
                    choose={() => choose(f)}
                  />
                ))}
              </View>
            </>
          )}
          {page === "Materials" && <Materials choose={choose} />}
          {page === "Editor" && (
            <Editor
              design={design}
              change={setDesign}
              name={name}
              setName={setName}
              estimate={estimate}
              setEstimate={setEstimate}
              materials={() => setPage("Materials")}
              room={() => setPage("Room")}
              save={save}
              busy={busy}
              error={error}
            />
          )}
          {page === "Room" && (
            <Room design={design} close={() => setPage("Editor")} />
          )}
          {page === "Projects" && (
            <>
              <View>
                <Label>ON THIS DEVICE</Label>
                <Title>Projects</Title>
              </View>
              <View style={s.section}>
                {readError ? (
                  <T accessibilityRole="alert">
                    Saved projects could not be loaded.
                  </T>
                ) : projects.length === 0 ? (
                  <T style={s.sub}>
                    Save a wardrobe design to keep its dimensions, finish and
                    estimate here.
                  </T>
                ) : (
                  projects.map((p) => (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setSelected(p);
                        setShareError(false);
                        setPage("Specification");
                      }}
                      style={[s.block, s.between]}
                    >
                      <Image
                        source={finishById(p.design.finish).image}
                        style={{ width: 52, height: 60, borderRadius: 4 }}
                      />
                      <View style={{ flex: 1, gap: 4 }}>
                        <T style={s.h3}>{p.name}</T>
                        <T style={s.sub}>
                          {p.design.bays} doors · MRK-{p.design.finish}
                        </T>
                      </View>
                      <Icon name="arrow" />
                    </Pressable>
                  ))
                )}
              </View>
              <Button icon="plus" onPress={() => edit()}>
                New design
              </Button>
            </>
          )}
          {page === "Specification" && selected && (
            <>
              <View>
                <Label>SAVED ON THIS DEVICE</Label>
                <Title>{selected.name}</Title>
              </View>
              <View style={s.block}>
                <T style={s.h2}>Design specification</T>
                <T selectable style={{ lineHeight: 27 }}>
                  {spec(selected)}
                </T>
              </View>
              <View style={s.row}>
                <Button icon="arrow" onPress={() => edit(selected)}>
                  Edit design
                </Button>
                <Button
                  secondary
                  onPress={async () => {
                    try {
                      await Share.share({ message: spec(selected) });
                      setShareError(false);
                    } catch {
                      setShareError(true);
                    }
                  }}
                >
                  Share specification
                </Button>
              </View>
              {shareError && (
                <T style={s.sub}>
                  Sharing is unavailable here. Select and copy the specification
                  above.
                </T>
              )}
              <Button secondary onPress={() => setPage("Projects")}>
                All projects
              </Button>
            </>
          )}
        </View>
      </ScrollView>
      {!wide && (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: color.line,
            backgroundColor: color.paper,
          }}
        >
          {nav}
        </View>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  const [fonts, fontError] = useFonts({
    Instrument: InstrumentSerif_400Regular,
    DMSans: DMSans_400Regular,
    DMBold: DMSans_600SemiBold,
  });
  if (!fonts && !fontError)
    return <View style={{ flex: 1, backgroundColor: color.paper }} />;
  return (
    <SafeAreaProvider>
      <StudioApp />
    </SafeAreaProvider>
  );
}
