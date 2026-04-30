import * as React from 'react';

import { NyviaRiseViewProps } from './NyviaRise.types';

export default function NyviaRiseView(props: NyviaRiseViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
