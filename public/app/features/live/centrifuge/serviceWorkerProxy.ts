import { CentrifugeSrv, CentrifugeSrvDeps } from './service';
import CentrifugeWorker, { RemoteCentrifugeService } from './service.worker';
import './transferHandlers';

import * as comlink from 'comlink';
import { asyncScheduler, Observable, observeOn } from 'rxjs';
import { LiveChannelAddress, LiveChannelConfig, LiveChannelEvent } from '@grafana/data';
import { liveTimer } from 'app/features/dashboard/dashgrid/liveTimer';
import { promiseWithRemoteObservableAsObservable } from './remoteObservable';

export class CentrifugeServiceWorkerProxy implements CentrifugeSrv {
  private centrifugeWorker;

  constructor(deps: CentrifugeSrvDeps) {
    this.centrifugeWorker = comlink.wrap<RemoteCentrifugeService>(new CentrifugeWorker());
    this.centrifugeWorker.initialize(deps, comlink.proxy(liveTimer.ok));
  }

  getConnectionState: CentrifugeSrv['getConnectionState'] = () => {
    return promiseWithRemoteObservableAsObservable(this.centrifugeWorker.getConnectionState());
  };

  getDataStream: CentrifugeSrv['getDataStream'] = (options, config) => {
    return promiseWithRemoteObservableAsObservable(this.centrifugeWorker.getDataStream(options, config)).pipe(
      // async scheduler splits the synchronous task of deserializing data from web worker and
      // consuming the message (ie. updating react component) into two to avoid blocking the event loop
      observeOn(asyncScheduler)
    );
  };

  getPresence: CentrifugeSrv['getPresence'] = (address, config) => {
    return this.centrifugeWorker.getPresence(address, config);
  };

  getStream: CentrifugeSrv['getStream'] = <T>(address: LiveChannelAddress, config: LiveChannelConfig) => {
    return promiseWithRemoteObservableAsObservable(
      this.centrifugeWorker.getStream(address, config) as Promise<comlink.Remote<Observable<LiveChannelEvent<T>>>>
    );
  };
}
