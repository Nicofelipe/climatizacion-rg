import { Text, View } from "react-native";

import { formatCurrency } from "@/utils/currency";

import styles from "./RecentExpense.styles";

import { RecentExpenseProps } from "./RecentExpense.types";

export default function RecentExpense({

    proveedor,

    total

}:RecentExpenseProps){

    return(

        <View style={styles.container}>

            <Text style={styles.supplier}>

                {proveedor}

            </Text>

            <Text style={styles.amount}>

                {formatCurrency(total)}

            </Text>

        </View>

    )

}