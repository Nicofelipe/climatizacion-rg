import { StyleSheet } from "react-native";

import {
    BorderRadius,
    Colors,
    Shadows,
    Spacing,
    Typography
} from "@/theme";

export default StyleSheet.create({

    card:{

        backgroundColor:Colors.surface,

        borderRadius:BorderRadius.lg,

        padding:Spacing.lg,

        ...Shadows.card

    },

    title:{

        color:Colors.textSecondary,

        fontSize:Typography.caption

    },

    value:{

        marginTop:Spacing.sm,

        fontSize:30,

        fontWeight:"700",

        color:Colors.primary

    }

});