import React from 'react';

import {
  QueryVariable,
  SceneComponentProps,
  sceneGraph,
  SceneObjectBase,
  SceneObjectState,
  VariableDependencyConfig,
} from '@grafana/scenes';
import { Stack, Text, TextLink } from '@grafana/ui';

import { PromMetricsMetadataItem } from '../../../plugins/datasource/prometheus/types';
import { ALL_VARIABLE_VALUE } from '../../variables/constants';
import { StatusWrapper } from '../StatusWrapper';
import { TRAILS_ROUTE, VAR_DATASOURCE_EXPR, VAR_GROUP_BY } from '../shared';
import { getMetricSceneFor, getTrailFor } from '../utils';

import { getLabelOptions } from './utils';

export interface MetricOverviewSceneState extends SceneObjectState {
  metadata?: PromMetricsMetadataItem;
  metadataLoading?: boolean;
}

export class MetricOverviewScene extends SceneObjectBase<MetricOverviewSceneState> {
  protected _variableDependency = new VariableDependencyConfig(this, {
    variableNames: [VAR_DATASOURCE_EXPR],
    onReferencedVariableValueChanged: this.onReferencedVariableValueChanged.bind(this),
  });

  constructor(state: Partial<MetricOverviewSceneState>) {
    super({
      ...state,
    });

    this.addActivationHandler(this._onActivate.bind(this));
  }

  private getVariable(): QueryVariable {
    const variable = sceneGraph.lookupVariable(VAR_GROUP_BY, this)!;
    if (!(variable instanceof QueryVariable)) {
      throw new Error('Group by variable not found');
    }

    return variable;
  }

  private _onActivate() {
    this.updateMetadata();
  }

  private onReferencedVariableValueChanged() {
    this.updateMetadata();
  }

  private async updateMetadata() {
    this.setState({ metadataLoading: true, metadata: undefined });
    const metricScene = getMetricSceneFor(this);
    const metric = metricScene.state.metric;

    const trail = getTrailFor(this);
    const metadata = await trail.getMetricMetadata(metric);
    this.setState({ metadata, metadataLoading: false });
  }

  public static Component = ({ model }: SceneComponentProps<MetricOverviewScene>) => {
    const { metadata, metadataLoading } = model.useState();
    const variable = model.getVariable();
    const { loading: labelsLoading } = variable.useState();
    const labelOptions = getLabelOptions(model, variable).filter((l) => l.value !== ALL_VARIABLE_VALUE);

    return (
      <StatusWrapper isLoading={labelsLoading || metadataLoading}>
        <Stack gap={6}>
          <>
            <Stack direction="column" gap={0.5}>
              <Text weight={'medium'}>Description</Text>
              <div style={{ maxWidth: 360 }}>
                {metadata?.help ? <div>{metadata?.help}</div> : <i>No description available</i>}
              </div>
            </Stack>
            <Stack direction="column" gap={0.5}>
              <Text weight={'medium'}>Type</Text>
              {metadata?.type ? <div>{metadata?.type}</div> : <i>Unknown</i>}
            </Stack>
            <Stack direction="column" gap={0.5}>
              <Text weight={'medium'}>Unit</Text>
              {metadata?.unit ? <div>{metadata?.unit}</div> : <i>Unknown</i>}
            </Stack>
            <Stack direction="column" gap={0.5}>
              <Text weight={'medium'}>Labels</Text>
              {labelOptions.length === 0 && 'Unable to fetch labels.'}
              {labelOptions.map((l) =>
                getTrailFor(model).state.embedded ? (
                  // Do not render as TextLink when in embedded mode, as any direct URL
                  // manipulation will take the browser out out of the current page.
                  <div key={l.label}>{l.label}</div>
                ) : (
                  <TextLink
                    key={l.label}
                    href={sceneGraph.interpolate(
                      model,
                      `${TRAILS_ROUTE}$\{__url.params:exclude:actionView,var-groupby}&actionView=breakdown&var-groupby=${encodeURIComponent(
                        l.value!
                      )}`
                    )}
                    title="View breakdown"
                  >
                    {l.label!}
                  </TextLink>
                )
              )}
            </Stack>
          </>
        </Stack>
      </StatusWrapper>
    );
  };
}

export function buildMetricOverviewScene() {
  return new MetricOverviewScene({});
}
