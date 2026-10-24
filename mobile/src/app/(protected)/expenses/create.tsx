import FormScrollView from '@/components/common/FormScrollView';
import {takeScannedReceiptDraft} from '@/utils/scannedReceiptDraft';
import ReceiptDateFilter from '@/components/common/ReceiptDateFilter';
import { validReceiptDate,todayReceiptDate } from '@/utils/receiptDate';
import {receiptSubmissionError} from '@/utils/receiptSubmission';
import AppContainer from '@/components/layout/AppContainer';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { expenseTypes } from '@/constants/expenseTypes';
import { useAuth } from '@/hooks/useAuth';
import { createExpense } from '@/services/ExpenseService';
import { createExpenseApi, getExpenseApi, getExpenseImageApi } from '@/api/expense.api';
import { Colors, Spacing, Typography } from '@/theme';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
} from 'react-native';

export default function CreateExpenseScreen() {
    const { token,user } = useAuth();
    const { editId,fromScan } = useLocalSearchParams<{ editId?: string;fromScan?:string }>();
    const isEditing = Boolean(editId);
    const receiptToday=todayReceiptDate();
    const firstReceiptDate=`${Number(receiptToday.slice(0,4))-(receiptToday.slice(5)<='03-15'?1:0)}-01-01`;

    const [receiptNumber, setReceiptNumber] = useState('');
    const [expenseDate, setExpenseDate] = useState('');
    const [expenseTypeId, setExpenseTypeId] = useState<number | null>(null);
    const [totalAmount, setTotalAmount] = useState('');
    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [imageMimeType,setImageMimeType]=useState<string|null>(null);
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [imageError, setImageError] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loadingExisting, setLoadingExisting] = useState(Boolean(editId));
    const [hasExistingImage, setHasExistingImage] = useState(false);
    const [existingImageUri, setExistingImageUri] = useState<string | null>(null);
    const [removeExistingImage, setRemoveExistingImage] = useState(false);
    const [loadingImage, setLoadingImage] = useState(false);
    const [existingImageError, setExistingImageError] = useState<string | null>(null);
    const [imageAttempt, setImageAttempt] = useState(0);
    const [supplierId, setSupplierId] = useState<number | null>(null);
    const [editBlocked, setEditBlocked] = useState(false);

    useEffect(()=>{
        if(fromScan!=='1'||!user)return;
        const draft=takeScannedReceiptDraft(user.id,user.companyId);if(!draft)return;
        setReceiptNumber(draft.receiptNumber);setExpenseDate(draft.expenseDate);setTotalAmount(draft.totalAmount);setExpenseTypeId(draft.expenseTypeId);setImageUri(draft.uri);setImageMimeType(draft.mimeType);
        setDescription(`IVA de la foto revisado: ${draft.vatAmount} CLP. Datos propuestos por lectura OCR y confirmados por el usuario.`);
    },[fromScan,user?.id,user?.companyId]);

    useEffect(() => {
        if (!editId || !token) return;
        let active = true;
        setLoadingExisting(true);
        setEditBlocked(true);
        getExpenseApi(token, Number(editId)).then(expense => {
            if (!active) return;
            if (expense.Status !== 'PENDING') {
                setSubmitError('Esta boleta ya no está pendiente y no se puede modificar.');
                return;
            }
            if(expense.UserId!==user?.id){setSubmitError('Solo puedes editar tus propias boletas pendientes.');return;}
            setReceiptNumber(expense.ReceiptNumber);
            setExpenseDate(expense.ExpenseDate.slice(0, 10));
            setExpenseTypeId(expense.ExpenseTypeId);
            setTotalAmount(String(expense.TotalAmount));
            setDescription(expense.Description ?? '');
            setSupplierId(expense.SupplierId);
            setHasExistingImage(Boolean(expense.file));
            setEditBlocked(false);
        }).catch(err => {
            if (active) setSubmitError(err instanceof Error ? err.message : 'No fue posible cargar la boleta.');
        }).finally(() => { if (active) setLoadingExisting(false); });
        return () => { active = false; };
    }, [editId, token,user?.id]);

    useEffect(() => {
        if (!editId || !token || !hasExistingImage) return;
        let active = true;
        setLoadingImage(true);
        setExistingImageError(null);
        getExpenseImageApi(token, Number(editId)).then(uri => {
            if (active) setExistingImageUri(uri);
        }).catch(err => {
            if (active) setExistingImageError(err instanceof Error ? err.message : 'No fue posible cargar la imagen guardada.');
        }).finally(() => { if (active) setLoadingImage(false); });
        return () => { active = false; };
    }, [editId, token, hasExistingImage, imageAttempt]);

    const previewUri = imageUri ?? (removeExistingImage ? null : existingImageUri);

    function removeSelectedImage() {
        if (imageUri) {
            setImageUri(null);
            setImageMimeType(null);
        } else if (hasExistingImage) {
            setRemoveExistingImage(true);
        }
        setImageError(null);
    }

    async function handlePickImage() {
        if (isSaving || saved || editBlocked) return;
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            setImageError('Necesitamos acceso a tus fotos para seleccionar la imagen de la boleta.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setImageMimeType(result.assets[0].mimeType??null);
            setImageError(null);
        }
    }

    async function handleTakePhoto() {
        if (isSaving || saved || editBlocked) return;
        const permission =
            await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
            setImageError('Necesitamos acceso a la cámara para fotografiar la boleta.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setImageMimeType(result.assets[0].mimeType??null);
            setImageError(null);
        }
    }

    function handleImageOptions() {
        if (isSaving || saved || loadingExisting || editBlocked) return;
        setShowImageOptions(true);
    }

    async function handleSubmit() {
        if (isSaving || saved || loadingExisting || editBlocked) return;
        setSubmitError(null);
        if (!token) {
            setSubmitError('Tu sesión no es válida. Vuelve a iniciar sesión.');
            return;
        }

        if (!imageUri && (!hasExistingImage || removeExistingImage)) {
            setImageError('Agrega una foto de la boleta para poder guardarla.');
            return;
        }

        const parsedTotalAmount = Number(totalAmount);
        const submissionError=receiptSubmissionError(expenseDate.trim());
        if(submissionError){setSubmitError(submissionError);return;}
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (
            !receiptNumber.trim() ||
            !expenseDate.trim() ||
            !validReceiptDate(expenseDate.trim()) || expenseDate.trim()>todayReceiptDate() ||
            !expenseTypeId ||
            !Number.isFinite(parsedTotalAmount) ||
            parsedTotalAmount <= 0
        ) {
            setSubmitError('Completa número, fecha, tipo de gasto y monto. La fecha debe usar el formato AAAA-MM-DD y el monto debe ser mayor que cero.');
            return;
        }

        setIsSaving(true);
        try {
            const data = {
                expenseTypeId,
                supplierId,
                receiptNumber: receiptNumber.trim(),
                expenseDate: expenseDate.trim(),
                totalAmount: parsedTotalAmount,
                description: description.trim() || null,
                imageUri,
                imageMimeType,
            };
            if (editId) await createExpenseApi(token, data, Number(editId));
            else await createExpense(token, data);

            setSaved(true);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'No fue posible registrar la boleta';

            setSubmitError(message);
        } finally {
            setIsSaving(false);
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
                {isEditing ? 'Editar boleta pendiente' : 'Registrar boleta'}
            </Text>

            <FormScrollView
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
                    {imageUri ? 'Nueva imagen seleccionada' : hasExistingImage && !removeExistingImage ? 'Imagen guardada de la boleta' : 'Imagen de la boleta (obligatoria)'}
                </Text>

                {imageError ? (
                    <Text accessibilityRole="alert" style={{ color: Colors.text, marginBottom: Spacing.sm }}>
                        {imageError}
                    </Text>
                ) : null}

                <Pressable
                    onPress={handleImageOptions}
                    style={{
                        alignSelf: 'center',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: Spacing.lg,
                    }}
                >
                    {previewUri ? (
                        <>
                            <Image
                                source={{ uri: previewUri }}
                                style={{
                                    width: 180,
                                    height: 180,
                                    borderRadius: 12,
                                }}
                                resizeMode="contain"
                                onError={() => setImageError('No fue posible mostrar la imagen. Puedes elegir otra foto.')}
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
                                    width: 48,
                                    height: 48,
                                    borderRadius: 16,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: Colors.primary,
                                }}
                            >
                                <Text style={{ fontSize: 22 }}>
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
                                {loadingImage && !removeExistingImage ? 'Cargando imagen guardada…' : hasExistingImage && !removeExistingImage ? 'Seleccionar otra foto (opcional)' : 'Agregar imagen'}
                            </Text>
                        </>
                    )}
                </Pressable>
                {loadingImage && !imageUri && !removeExistingImage ? <ActivityIndicator style={{ marginBottom: Spacing.md }} /> : null}
                {existingImageError && !imageUri && !removeExistingImage ? <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
                    <Text accessibilityRole="alert" style={{ color: Colors.danger }}>{existingImageError}</Text>
                    <Button title="Reintentar imagen guardada" onPress={() => setImageAttempt(value => value + 1)} disabled={isSaving || saved} />
                </View> : null}
                {previewUri ? <View style={{ marginBottom: Spacing.md }}>
                    <Button title={imageUri ? 'Quitar foto seleccionada' : 'Quitar imagen para reemplazarla'} onPress={removeSelectedImage} disabled={isSaving || saved} />
                </View> : null}
                {hasExistingImage && (removeExistingImage || imageUri) ? <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
                    <Text style={{ color: Colors.textSecondary }}>La imagen guardada se conserva hasta que guardes una foto de reemplazo. La boleta debe tener siempre una imagen.</Text>
                    <Button title="Cancelar reemplazo y conservar imagen original" onPress={() => {
                        setImageUri(null); setRemoveExistingImage(false); setImageError(null);
                    }} disabled={isSaving || saved} />
                </View> : null}

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
                    placeholder="AAAA-MM-DD"
                />
                <View style={{marginBottom:Spacing.lg,gap:8}}><ReceiptDateFilter label="Elegir fecha en calendario" value={expenseDate} onChange={setExpenseDate} clearable={false} minDate={firstReceiptDate} maxDate={receiptToday}/><Text style={{fontSize:12,color:Colors.textSecondary}}>Puedes escribir la fecha o elegirla en el calendario. El año anterior se puede rendir hasta el 15 de marzo inclusive.</Text></View>

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
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                    }}
                >
                    {expenseTypes.map((type) => (
                        <View key={type.id} style={{flexBasis:'46%',flexGrow:1}}>
                        <Button
                            key={type.id}
                            variant="choice"
                            selected={expenseTypeId===type.id}
                            title={
                                expenseTypeId === type.id
                                    ? `✓ ${type.name}`
                                    : type.name
                            }
                            onPress={() => setExpenseTypeId(type.id)}
                        />
                        </View>
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

                {submitError ? (
                    <View accessibilityRole="alert" style={{ backgroundColor: '#FEF2F2', borderColor: Colors.danger, borderWidth: 1, borderRadius: 12, padding: Spacing.md, marginBottom: Spacing.md }}>
                        <Text style={{ color: '#991B1B' }}>{submitError}</Text>
                    </View>
                ) : null}
                {saved ? (
                    <View style={{ gap: Spacing.md }}>
                        <Text accessibilityRole="alert" style={{ color: Colors.success }}>{isEditing ? 'Cambios guardados correctamente.' : 'Boleta guardada correctamente con su respaldo en Drive.'}</Text>
                        <Button title={isEditing ? 'Volver al detalle' : 'Ver mis boletas'} onPress={() => editId ? router.replace({ pathname: '/(protected)/expenses/[id]', params: { id: editId } }) : router.replace('/(protected)/(tabs)/expenses')} />
                    </View>
                ) : <Button
                    title={loadingExisting ? 'Cargando boleta…' : isSaving ? 'Guardando boleta…' : isEditing ? 'Guardar cambios' : 'Guardar boleta'}
                    onPress={handleSubmit}
                    loading={isSaving}
                    disabled={isSaving || loadingExisting || editBlocked}
                />}
            </FormScrollView>
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
