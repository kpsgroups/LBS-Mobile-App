import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from "react-native";
import { products, type Product } from "./model";
import { productImages } from "./productImages";
import { Icon, T, color } from "./ui";

const categories = ["All", ...new Set(products.map(item => item.category))];

export function FurnitureCatalog({ choose }: { choose: (item: Product) => void }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [category, setCategory] = useState("All");
  const { width } = useWindowDimensions();
  const needle = query.trim().toLowerCase();
  const items = products.filter(item =>
    (category === "All" || item.category === category) &&
    (item.title + " " + item.category).toLowerCase().includes(needle)
  );

  return <View style={{ gap: 16 }}>
    <View style={styles.between}>
      <T accessibilityRole="header" style={styles.heading}>Furniture catalog</T>
      <Pressable accessibilityRole="button" accessibilityLabel={searching ? "Close search" : "Search furniture"}
        onPress={() => { setSearching(!searching); setQuery(""); }} style={styles.round}>
        <Icon name={searching ? "close" : "search"} size={20}/>
      </Pressable>
    </View>
    {searching && <TextInput autoFocus accessibilityLabel="Search designs" placeholder="Search designs" value={query}
      onChangeText={setQuery} style={styles.input}/>}
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{gap: 8, alignItems:"center"}}>
      {categories.map(name => <Pressable key={name} accessibilityRole="button" accessibilityState={{selected: category === name}}
        onPress={() => setCategory(name)} style={[styles.filter, category === name && styles.selected]}>
        <T style={{fontSize:14, color: category === name ? "#fff" : color.ink}}>{name === "All" ? "All designs" : name}</T>
      </Pressable>)}
    </ScrollView>
    <View style={styles.grid}>
      {items.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityLabel={"Configure " + item.title}
        onPress={() => choose(item)} style={{width: width < 600 ? "100%" : width < 980 ? "49%" : "32%"}}>
        <View style={styles.photo}>
          <Image source={productImages[item.key]} resizeMode="contain" style={styles.image}/>
        </View>
        <View style={[styles.between,{paddingVertical:12}]}>
          <View style={{flex:1, gap:3}}>
            <T style={styles.title}>{item.title}</T>
            <T style={styles.dimensions}>{item.design.width} × {item.design.height} × {item.design.depth} mm</T>
          </View>
          <Icon name="arrow" size={19} tint={color.sage}/>
        </View>
      </Pressable>)}
    </View>
    {!items.length && <T>No matching designs. Try another category or name.</T>}
  </View>;
}

const styles = StyleSheet.create({
  heading:{fontFamily:"Instrument",fontSize:37,lineHeight:44,letterSpacing:-0.8,flexShrink:1},
  between:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:12},
  round:{width:44,height:44,borderRadius:22,borderWidth:1,borderColor:color.line,alignItems:"center",justifyContent:"center"},
  input:{borderWidth:1,borderColor:color.line,borderRadius:8,padding:12,fontSize:16,color:color.ink},
  filter:{minHeight:42,paddingHorizontal:15,borderRadius:24,backgroundColor:"#eeede5",justifyContent:"center"},
  selected:{backgroundColor:color.sage},
  grid:{flexDirection:"row",flexWrap:"wrap",columnGap:"2%",rowGap:12},
  photo:{width:"100%",aspectRatio:1.5,overflow:"hidden",borderRadius:10,backgroundColor:"#e9e4d9"},
  image:{position:"absolute",left:0,top:0,width:"100%",height:"100%"},
  title:{fontSize:22,lineHeight:29,fontFamily:"Instrument"},
  dimensions:{fontSize:13,lineHeight:19,color:color.muted}
});
