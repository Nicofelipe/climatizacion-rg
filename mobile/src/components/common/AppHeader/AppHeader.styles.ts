import { StyleSheet } from "react-native";

import { Colors, Spacing } from "@/theme";

export default StyleSheet.create({

    container:{

        marginBottom:Spacing.xl,

    },

    greeting:{

        fontSize:16,

        color:Colors.textSecondary

    },

    name:{

        marginTop:6,

        fontSize:30,

        fontWeight:"700",

        color:Colors.text

    }

});