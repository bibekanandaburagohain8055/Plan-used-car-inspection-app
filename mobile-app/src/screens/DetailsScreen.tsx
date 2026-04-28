import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ErrorCard } from '../components/ErrorCard';
import { VehicleDataCard } from '../components/VehicleDataCard';
import { useInspection } from '../context/InspectionContext';
import { colors, commonStyles, radii, spacing } from '../styles/theme';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  numeric?: boolean;
  uppercase?: boolean;
}

function Field({ label, value, onChangeText, placeholder, numeric, uppercase }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={commonStyles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8ca2af"
        keyboardType={numeric ? 'numeric' : 'default'}
        autoCapitalize={uppercase ? 'characters' : 'none'}
        style={commonStyles.input}
      />
    </View>
  );
}

export function DetailsScreen() {
  const {
    details,
    updateDetail,
    vehicleData,
    vehicleLoading,
    vehicleError,
    doVehicleLookup,
    clearVehicleError,
    goToStep,
  } = useInspection();

  return (
    <ScrollView contentContainerStyle={commonStyles.scrollContent} showsVerticalScrollIndicator={false}>
      <Text style={commonStyles.sectionTitle}>Car Details</Text>
      <Text style={commonStyles.bodyText}>
        Enter vehicle info and fetch registration data from the configured India vehicle API.
      </Text>

      <Field
        label="Car Name"
        value={details.carName}
        onChangeText={(t) => updateDetail('carName', t)}
        placeholder="e.g. Hyundai i20 Sportz"
      />
      <Field
        label="Registration Number"
        value={details.registrationNumber}
        onChangeText={(t) => updateDetail('registrationNumber', t.toUpperCase())}
        placeholder="e.g. AS01AB1234"
        uppercase
      />
      <Field
        label="Asking Price (INR)"
        value={details.askingPrice}
        onChangeText={(t) => updateDetail('askingPrice', t.replace(/[^0-9]/g, ''))}
        placeholder="e.g. 520000"
        numeric
      />
      <Field
        label="Odometer (km)"
        value={details.odometer}
        onChangeText={(t) => updateDetail('odometer', t.replace(/[^0-9]/g, ''))}
        placeholder="e.g. 64000"
        numeric
      />

      <Pressable
        style={[styles.secondaryButton, vehicleLoading && styles.disabled]}
        onPress={doVehicleLookup}
        disabled={vehicleLoading}
      >
        {vehicleLoading ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : null}
        <Text style={commonStyles.secondaryButtonText}>
          {vehicleLoading ? 'Fetching...' : 'Fetch Vehicle API Details'}
        </Text>
      </Pressable>

      {vehicleError ? <ErrorCard message={vehicleError} onDismiss={clearVehicleError} /> : null}
      {vehicleData ? <VehicleDataCard data={vehicleData} /> : null}

      <Pressable style={commonStyles.primaryButton} onPress={() => goToStep('photos')}>
        <Text style={commonStyles.primaryButtonText}>Continue to Photo Capture</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  secondaryButton: {
    ...commonStyles.secondaryButton,
  },
  disabled: { opacity: 0.6 },
});
