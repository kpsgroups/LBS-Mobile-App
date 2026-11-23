import React from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  type TextProps,
} from "react-native";
import Svg, { Path } from "react-native-svg";

export const color = {
  ink: "#292923",
  muted: "#66665b",
  paper: "#f8f7f2",
  line: "#deddd3",
  sage: "#414c39",
  white: "#fffef9",
  warm: "#ede8dc",
};
export function T({ style, ...props }: TextProps) {
  return (
    <Text
      {...props}
      style={[{ fontFamily: "DMSans", color: color.ink, fontSize: 15 }, style]}
    />
  );
}
export function Title({ children }: React.PropsWithChildren) {
  return (
    <T
      accessibilityRole="header"
      style={{
        fontFamily: "Instrument",
        fontSize: 48,
        lineHeight: 54,
        letterSpacing: -1,
      }}
    >
      {children}
    </T>
  );
}
export function Label({ children }: React.PropsWithChildren) {
  return (
    <T
      style={{
        fontFamily: "DMBold",
        fontSize: 10,
        letterSpacing: 1.3,
        color: color.muted,
      }}
    >
      {children}
    </T>
  );
}
const paths = {
  arrow: "M4 12h15m-6-6 6 6-6 6",
  back: "m13 5-7 7 7 7",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  studio: "m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9",
  materials: "m12 3 10 5-10 5L2 8zM3 12l9 5 9-5M3 16l9 5 9-5",
  projects: "M3 7V5a1 1 0 0 1 1-1h6l2 3h8a1 1 0 0 1 1 1v11H3z",
  camera: "M3 9V5h4m10 0h4v4M3 15v4h4m10 0h4v-4m-9-8 5 3v5l-5 3-5-3v-5z",
  rotate: "M4 9a8 8 0 1 1 0 6m0-11v5h5",
  check: "m4 12 5 5L20 6",
  search: "M15 15l6 6M17 10a7 7 0 1 1-14 0 7 7 0 1 1 14 0",
  close: "m5 5 14 14M19 5 5 19",
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 21,
  tint = color.ink,
}: {
  name: IconName;
  size?: number;
  tint?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d={paths[name]}
        stroke={tint}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
export function Button({
  children,
  onPress,
  icon,
  secondary = false,
  disabled = false,
}: React.PropsWithChildren<{
  onPress: () => void;
  icon?: IconName;
  secondary?: boolean;
  disabled?: boolean;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        { opacity: disabled ? 0.4 : pressed ? 0.78 : 1 },
      ]}
    >
      <T
        style={{
          fontFamily: "DMBold",
          color: secondary ? color.ink : color.white,
          fontSize: 14,
        }}
      >
        {children}
      </T>
      {icon && (
        <Icon
          name={icon}
          size={18}
          tint={secondary ? color.ink : color.white}
        />
      )}
    </Pressable>
  );
}
export function Chips<V extends string | number>({
  values,
  selected,
  select,
  label,
}: {
  values: readonly V[];
  selected: V;
  select: (v: V) => void;
  label?: string;
}) {
  return (
    <View style={s.row}>
      {values.map((value) => (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: selected === value }}
          accessibilityLabel={label ? label + " " + value : String(value)}
          key={value}
          onPress={() => select(value)}
          style={[s.chip, selected === value && s.active]}
        >
          <T
            style={{
              color: selected === value ? color.white : color.ink,
              fontSize: 13,
            }}
          >
            {value}
          </T>
        </Pressable>
      ))}
    </View>
  );
}
export const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  section: { gap: 14 },
  line: { height: 1, backgroundColor: color.line },
  sub: { fontSize: 14, color: color.muted, lineHeight: 21 },
  h2: { fontFamily: "Instrument", fontSize: 32, lineHeight: 38 },
  h3: { fontFamily: "DMBold", fontSize: 16 },
  button: {
    minHeight: 48,
    borderRadius: 6,
    backgroundColor: color.sage,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  secondary: {
    backgroundColor: color.paper,
    borderWidth: 1,
    borderColor: color.line,
  },
  chip: {
    minHeight: 42,
    paddingHorizontal: 15,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: color.line,
    justifyContent: "center",
  },
  active: { backgroundColor: color.sage, borderColor: color.sage },
  input: {
    fontFamily: "DMSans",
    fontSize: 16,
    color: color.ink,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: 6,
    backgroundColor: color.white,
  },
  block: {
    padding: 16,
    gap: 12,
    backgroundColor: color.white,
    borderRadius: 8,
    borderColor: color.line,
    borderWidth: 1,
  },
});
