import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { expenseTypes } from '@/constants/expenseTypes';
import { useAuth } from '@/hooks/useAuth';
import { createExpense } from '@/services/ExpenseService';
import { Colors, Spacing, Typography } from '@/theme';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

export default function CreateExpenseScreen() {
    const { token } = useAuth();

    const [receiptNumber, setReceiptNumber] = useState('');
    const [expenseDate, setExpenseDate] = useState('');
    const [expenseTypeId, setExpenseTypeId] = useState<number | null>(null);
    const [totalAmount, setTotalAmount] = useState('');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [showImageOptions, setShowImageOptions] = useState(false);

    async function handlePickImage() {
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                'Permiso requerido',
                'Necesitamos acceso a tus fotos para seleccionar la imagen de la boleta.'
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            console.log('Selected image asset:', result.assets[0]);
            setImageUri(result.assets[0].uri);
        }
    }

    async function handleTakePhoto() {
        const permission =
            await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
            Alert.alert(
                'Permiso requerido',
                'Necesitamos acceso a la cámara para fotografiar la boleta.'
            );
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    }

    function handleImageOptions() {
        setShowImageOptions(true);
    }

    async function handleSubmit() {
        if (!token) {
            Alert.alert('Error', 'Sesión no válida');
            return;
        }

        const parsedTotalAmount = Number(totalAmount);
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (
            !receiptNumber.trim() ||
            !expenseDate.trim() ||
            !datePattern.test(expenseDate.trim()) ||
            !expenseTypeId ||
            !Number.isFinite(parsedTotalAmount) ||
            parsedTotalAmount <= 0
        ) {
            Alert.alert(
                'Datos incompletos',
                'Completa correctamente los campos obligatorios. La fecha debe usar el formato AAAA-MM-DD.'
            );
            return;
        }

        try {
            await createExpense(token, {
                expenseTypeId,
                supplierId: null,
                receiptNumber: receiptNumber.trim(),
                expenseDate: expenseDate.trim(),
                totalAmount: parsedTotalAmount,
                description: description.trim() || null,
                imageUri,
            });

            Alert.alert(
                'Boleta registrada',
                'La boleta fue guardada correctamente.'
            );

            router.replace('/(protected)/(tabs)/expenses');
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'No fue posible registrar la boleta';

            Alert.alert('Error', message);
        }
    }

    return (
        <AppContainer>
            <Text
                style={{
                    fontSize: Typography.heading,
                    fontWeight: '700',
                    color: Colors.text,
                    marginBottom: Spacing.lg,
                }}
            >
                Registrar boleta
            </Text>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: 40,
                }}
            >
                <Text
                    style={{
                        color: Colors.text,
                        fontSize: Typography.body,
                        marginBottom: Spacing.sm,
                    }}
                >
                    Imagen de la boleta
                </Text>

                <Pressable
                    onPress={handleImageOptions}
                    style={{
                        alignSelf: 'center',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: Spacing.lg,
                    }}
                >
                    {imageUri ? (
                        <>
                            <Image
                                source={{ uri: imageUri }}
                                style={{
                                    width: 180,
                                    height: 180,
                                    borderRadius: 12,
                                }}
                                resizeMode="contain"
                            />

                            <Text
                                style={{
                                    marginTop: Spacing.sm,
                                    color: Colors.primary,
                                    fontSize: Typography.body,
                                }}
                            >
                                Cambiar imagen
                            </Text>
                        </>
                    ) : (
                        <>
                            <View
                                style={{
                                    width: 90,
                                    height: 90,
                                    borderRadius: 45,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: Colors.primary,
                                }}
                            >
                                <Text style={{ fontSize: 38 }}>
                                    📷
                                </Text>
                            </View>

                            <Text
                                style={{
                                    marginTop: Spacing.sm,
                                    color: Colors.textSecondary,
                                    fontSize: Typography.body,
                                }}
                            >
                                Agregar imagen
                            </Text>
                        </>
                    )}
                </Pressable>


                <Input
                    label="Número de boleta"
                    value={receiptNumber}
                    onChangeText={setReceiptNumber}
                    placeholder="Ej: 12345"
                />

                <Input
                    label="Fecha"
                    value={expenseDate}
                    onChangeText={setExpenseDate}
                    placeholder="2026-08-26"
                />

                <Text
                    style={{
                        color: Colors.text,
                        fontSize: Typography.body,
                        marginBottom: Spacing.sm,
                    }}
                >
                    Tipo de gasto
                </Text>

                <View
                    style={{
                        gap: Spacing.sm,
                        marginBottom: Spacing.lg,
                    }}
                >
                    {expenseTypes.map((type) => (
                        <Button
                            key={type.id}
                            title={
                                expenseTypeId === type.id
                                    ? `✓ ${type.name}`
                                    : type.name
                            }
                            onPress={() => setExpenseTypeId(type.id)}
                        />
                    ))}
                </View>

                <Input
                    label="Monto total"
                    value={totalAmount}
                    onChangeText={setTotalAmount}
                    placeholder="Ej: 11900"
                    keyboardType="numeric"
                />

                <Input
                    label="Descripción"
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Opcional"
                />

                <Button
                    title="Guardar boleta"
                    onPress={handleSubmit}
                />
            </ScrollView>
            <Modal
                visible={showImageOptions}
                transparent
                animationType="fade"
                onRequestClose={() => setShowImageOptions(false)}
            >
                <Pressable
                    onPress={() => setShowImageOptions(false)}
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: Spacing.lg,
                    }}
                >
                    <Pressable
                        onPress={(event) => event.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 360,
                            backgroundColor: Colors.background,
                            borderRadius: 16,
                            padding: Spacing.lg,
                        }}
                    >
                        <Text
                            style={{
                                fontSize: Typography.heading,
                                fontWeight: '700',
                                color: Colors.text,
                                textAlign: 'center',
                                marginBottom: Spacing.lg,
                            }}
                        >
                            Agregar imagen
                        </Text>

                        <View
                            style={{
                                gap: Spacing.sm,
                            }}
                        >
                            <Button
                                title="📷 Tomar foto"
                                onPress={() => {
                                    setShowImageOptions(false);
                                    handleTakePhoto();
                                }}
                            />

                            <Button
                                title="🖼️ Elegir de galería"
                                onPress={() => {
                                    setShowImageOptions(false);
                                    handlePickImage();
                                }}
                            />

                            <Button
                                title="Cancelar"
                                onPress={() => setShowImageOptions(false)}
                            />
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        </AppContainer>
    );
}