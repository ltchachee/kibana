/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @ts-ignore
import { handleError } from '../../../../lib/errors';
import { AlertsFactory } from '../../../../alerts';
import { LegacyServer, RouteDependencies } from '../../../../types';
import { ALERT_ACTION_TYPE_LOG } from '../../../../../common/constants';
import { ActionResult } from '../../../../../../actions/common';
import { disableWatcherClusterAlerts } from '../../../../lib/alerts/disable_watcher_cluster_alerts';
import { AlertTypeParams, SanitizedAlert } from '../../../../../../alerting/common';

const DEFAULT_SERVER_LOG_NAME = 'Monitoring: Write to Kibana log';

export function enableAlertsRoute(server: LegacyServer, npRoute: RouteDependencies) {
  npRoute.router.post(
    {
      path: '/api/monitoring/v1/alerts/enable',
      validate: false,
    },
    async (context, request, response) => {
      try {
        const alerts = AlertsFactory.getAll();
        if (alerts.length) {
          const { isSufficientlySecure, hasPermanentEncryptionKey } = npRoute.alerting
            ?.getSecurityHealth
            ? await npRoute.alerting?.getSecurityHealth()
            : { isSufficientlySecure: false, hasPermanentEncryptionKey: false };

          if (!isSufficientlySecure || !hasPermanentEncryptionKey) {
            server.log.info(
              `Skipping rule creation for "${context.infra.spaceId}" space; Stack Monitoring rules require API keys to be enabled and an encryption key to be configured.`
            );
            return response.ok({
              body: {
                isSufficientlySecure,
                hasPermanentEncryptionKey,
              },
            });
          }
        }

        const rulesClient = context.alerting?.getRulesClient();
        const actionsClient = context.actions?.getActionsClient();
        const types = context.actions?.listTypes();
        if (!rulesClient || !actionsClient || !types) {
          return response.ok({ body: undefined });
        }

        // Get or create the default log action
        let serverLogAction;
        const allActions = await actionsClient.getAll();
        for (const action of allActions) {
          if (action.name === DEFAULT_SERVER_LOG_NAME) {
            serverLogAction = action as ActionResult;
            break;
          }
        }

        if (!serverLogAction) {
          serverLogAction = await actionsClient.create({
            action: {
              name: DEFAULT_SERVER_LOG_NAME,
              actionTypeId: ALERT_ACTION_TYPE_LOG,
              config: {},
              secrets: {},
            },
          });
        }

        const actions = [
          {
            id: serverLogAction.id,
            config: {},
          },
        ];

        let createdAlerts: Array<SanitizedAlert<AlertTypeParams>> = [];
        const disabledWatcherClusterAlerts = await disableWatcherClusterAlerts(
          npRoute.cluster.asScoped(request).asCurrentUser,
          npRoute.logger
        );

        if (disabledWatcherClusterAlerts) {
          createdAlerts = await Promise.all(
            alerts.map((alert) => alert.createIfDoesNotExist(rulesClient, actionsClient, actions))
          );
        }

        server.log.info(
          `Created ${createdAlerts.length} alerts for "${context.infra.spaceId}" space`
        );

        return response.ok({ body: { createdAlerts, disabledWatcherClusterAlerts } });
      } catch (err) {
        throw handleError(err);
      }
    }
  );
}
