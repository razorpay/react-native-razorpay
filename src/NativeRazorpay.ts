import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  multiply(a: number, b: number): number;
  open(options: Object): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('Razorpay');
