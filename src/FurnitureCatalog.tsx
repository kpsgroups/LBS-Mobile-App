import React, { useState } from "react";
import { Image, Pressable, TextInput, View, useWindowDimensions } from "react-native";
import { products, type Product } from "./model";
import { productImages } from "./productImages";
import { Chips, T, Title, color, s } from "./ui";

export function FurnitureCatalog({ choose }: { choose: (item: Product) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const wide = useWindowDimensions().width >= 740;
  const items = products.filter(p => (category === "All" || p.category === category) && (p.title+" "+p.category).toLowerCase().includes(query.trim().toLowerCase()));
  return <View style={s.section}>
    <Title>Furniture catalog</Title>
    <TextInput accessibilityLabel="Search furniture" placeholder="Search furniture designs" style={s.input} value={query} onChangeText={setQuery}/>
    <Chips values={["All", ...new Set(products.map(p => p.category))]} selected={category} select={setCategory}/>
    <T style={s.sub}>{items.length} designs</T>
    <View style={{flexDirection:"row", flexWrap:"wrap", columnGap:"2%", rowGap:18}}>
      {items.map(p => <Pressable accessibilityRole="button" accessibilityLabel={"Configure "+p.title} key={p.key} onPress={()=>choose(p)} style={{width:wide?"23%":"49%",gap:5}}>
        <Image source={productImages[p.key]} style={{width:"100%",aspectRatio:4/3,borderRadius:6}}/>
        <T style={s.h3}>{p.title}</T><T style={{fontSize:12,color:color.muted}}>{p.design.width} × {p.design.height} × {p.design.depth} mm</T>
      </Pressable>)}
    </View>
    {!items.length && <T>No matching designs. Try another category or name.</T>}
  </View>;
}
