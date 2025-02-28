/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, Fragment, memo, useMemo } from 'react';
import styled from 'styled-components';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';

import type { NewPackagePolicyInput, RegistryVarsEntry } from '../../../../types';
import type { PackagePolicyConfigValidationResults } from '../services';
import { isAdvancedVar, validationHasErrors } from '../services';

import { PackagePolicyInputVarField } from './package_policy_input_var_field';

const FlexItemWithMaxWidth = styled(EuiFlexItem)`
  max-width: calc(50% - ${(props) => props.theme.eui.euiSizeL});
`;

export const PackagePolicyInputConfig: React.FunctionComponent<{
  hasInputStreams: boolean;
  packageInputVars?: RegistryVarsEntry[];
  packagePolicyInput: NewPackagePolicyInput;
  updatePackagePolicyInput: (updatedInput: Partial<NewPackagePolicyInput>) => void;
  inputVarsValidationResults: PackagePolicyConfigValidationResults;
  forceShowErrors?: boolean;
}> = memo(
  ({
    hasInputStreams,
    packageInputVars,
    packagePolicyInput,
    updatePackagePolicyInput,
    inputVarsValidationResults,
    forceShowErrors,
  }) => {
    // Showing advanced options toggle state
    const [isShowingAdvanced, setIsShowingAdvanced] = useState<boolean>(false);

    // Errors state
    const hasErrors = forceShowErrors && validationHasErrors(inputVarsValidationResults);

    const requiredVars: RegistryVarsEntry[] = [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const advancedVars: RegistryVarsEntry[] = [];

    if (packageInputVars) {
      packageInputVars.forEach((varDef) => {
        if (isAdvancedVar(varDef)) {
          advancedVars.push(varDef);
        } else {
          requiredVars.push(varDef);
        }
      });
    }

    const advancedVarsWithErrorsCount: number = useMemo(
      () =>
        advancedVars.filter(
          ({ name: varName }) => inputVarsValidationResults.vars?.[varName]?.length
        ).length,
      [advancedVars, inputVarsValidationResults.vars]
    );

    return (
      <EuiFlexGrid columns={2}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" alignItems="flexStart">
            <EuiFlexItem grow={1} />
            <EuiFlexItem grow={5}>
              <EuiText>
                <h4>
                  <FormattedMessage
                    id="xpack.fleet.createPackagePolicy.stepConfigure.inputSettingsTitle"
                    defaultMessage="Settings"
                  />
                </h4>
              </EuiText>
              {hasInputStreams ? (
                <>
                  <EuiSpacer size="s" />
                  <EuiText color="subdued" size="s">
                    <p>
                      <FormattedMessage
                        id="xpack.fleet.createPackagePolicy.stepConfigure.inputSettingsDescription"
                        defaultMessage="The following settings are applicable to all inputs below."
                      />
                    </p>
                  </EuiText>
                </>
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <FlexItemWithMaxWidth>
          <EuiFlexGroup direction="column" gutterSize="m">
            {requiredVars.map((varDef) => {
              const { name: varName, type: varType } = varDef;
              if (!packagePolicyInput.vars) return;
              const { value, frozen } = packagePolicyInput.vars[varName];
              return (
                <EuiFlexItem key={varName}>
                  <PackagePolicyInputVarField
                    varDef={varDef}
                    value={value}
                    frozen={frozen}
                    onChange={(newValue: any) => {
                      updatePackagePolicyInput({
                        vars: {
                          ...packagePolicyInput.vars,
                          [varName]: {
                            type: varType,
                            value: newValue,
                          },
                        },
                      });
                    }}
                    errors={inputVarsValidationResults.vars![varName]}
                    forceShowErrors={forceShowErrors}
                  />
                </EuiFlexItem>
              );
            })}
            {advancedVars.length ? (
              <Fragment>
                <EuiFlexItem>
                  {/* Wrapper div to prevent button from going full width */}
                  <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        iconType={isShowingAdvanced ? 'arrowDown' : 'arrowRight'}
                        onClick={() => setIsShowingAdvanced(!isShowingAdvanced)}
                        flush="left"
                      >
                        <FormattedMessage
                          id="xpack.fleet.createPackagePolicy.stepConfigure.toggleAdvancedOptionsButtonText"
                          defaultMessage="Advanced options"
                        />
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                    {!isShowingAdvanced && hasErrors && advancedVarsWithErrorsCount ? (
                      <EuiFlexItem grow={false}>
                        <EuiText color="danger" size="s">
                          <FormattedMessage
                            id="xpack.fleet.createPackagePolicy.stepConfigure.errorCountText"
                            defaultMessage="{count, plural, one {# error} other {# errors}}"
                            values={{ count: advancedVarsWithErrorsCount }}
                          />
                        </EuiText>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
                </EuiFlexItem>
                {isShowingAdvanced
                  ? advancedVars.map((varDef) => {
                      const { name: varName, type: varType } = varDef;
                      const value = packagePolicyInput.vars?.[varName]?.value;
                      return (
                        <EuiFlexItem key={varName}>
                          <PackagePolicyInputVarField
                            varDef={varDef}
                            value={value}
                            onChange={(newValue: any) => {
                              updatePackagePolicyInput({
                                vars: {
                                  ...packagePolicyInput.vars,
                                  [varName]: {
                                    type: varType,
                                    value: newValue,
                                  },
                                },
                              });
                            }}
                            errors={inputVarsValidationResults.vars![varName]}
                            forceShowErrors={forceShowErrors}
                          />
                        </EuiFlexItem>
                      );
                    })
                  : null}
              </Fragment>
            ) : null}
          </EuiFlexGroup>
        </FlexItemWithMaxWidth>
      </EuiFlexGrid>
    );
  }
);
