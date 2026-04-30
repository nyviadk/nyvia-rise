import { requireNativeView } from 'expo';
import * as React from 'react';

import { NyviaRiseViewProps } from './NyviaRise.types';

const NativeView: React.ComponentType<NyviaRiseViewProps> =
  requireNativeView('NyviaRise');

export default function NyviaRiseView(props: NyviaRiseViewProps) {
  return <NativeView {...props} />;
}
