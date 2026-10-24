import { Text, View } from "react-native";

import styles from "./StatisticCard.styles";

import { StatisticCardProps } from "./StatisticCard.types";

export default function StatisticCard({

    title,

    value,

    color

}:StatisticCardProps){

    return (

        <View style={styles.card}>

            <Text style={styles.title}>

                {title}

            </Text>

            <Text style={[

                styles.value,

                color && {

                    color

                }

            ]}>

                {value}

            </Text>

        </View>

    )

}