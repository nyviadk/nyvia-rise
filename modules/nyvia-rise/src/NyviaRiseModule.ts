import { NativeModule, requireNativeModule } from 'expo';

import { NyviaRiseModuleEvents } from './NyviaRise.types';

declare class NyviaRiseModule extends NativeModule<NyviaRiseModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<NyviaRiseModule>('NyviaRise');
