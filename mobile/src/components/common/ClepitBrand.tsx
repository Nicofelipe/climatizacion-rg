import {Image} from 'react-native';

export default function ClepitBrand({width=220}:{width?:number}){
 return <Image source={require('../../../assets/images/clepit-logo.png')} accessibilityLabel="Clepit" resizeMode="contain" style={{width,height:width*0.4,alignSelf:'center'}}/>;
}
