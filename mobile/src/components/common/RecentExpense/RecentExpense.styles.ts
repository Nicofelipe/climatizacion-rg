import { StyleSheet } from "react-native";

import { Colors, Spacing } from "@/theme";

export default StyleSheet.create({

    container:{

        flexDirection:"row",

        justifyContent:"space-between",

        paddingVertical:Spacing.md,

        borderBottomWidth:1,

        borderBottomColor:"#ECECEC"

    },

    supplier:{

        color:Colors.text,

        fontSize:16

    },

    amount:{

        color:Colors.primary,

        fontWeight:"600"

    }

});