import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './NyviaRise.types';

type NyviaRiseModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class NyviaRiseModule extends NativeModule<NyviaRiseModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(NyviaRiseModule, 'NyviaRiseModule');
