import { Text, View } from "react-native";

import styles from "./AppHeader.styles";

interface Props{

    greeting:string;

    name:string;

}

export default function AppHeader({

    greeting,

    name

}:Props){

    return(

        <View style={styles.container}>

            <Text style={styles.greeting}>

                {greeting}

            </Text>

            <Text style={styles.name}>

                {name}

            </Text>

        </View>

    );

}