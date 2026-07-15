import { connect, kea, key, path, props } from 'kea'
import { forms } from 'kea-forms'
import { router } from 'kea-router'

import { lemonToast } from '@posthog/lemon-ui'

import { teamLogic } from 'scenes/teamLogic'

import { FilterLogicalOperator, UniversalFiltersGroup } from '~/types'

import { logsRetentionRulesCreate, logsRetentionRulesPartialUpdate } from 'products/logs/frontend/generated/api'
import { LogsRetentionRuleApi, PatchedLogsRetentionRuleApi } from 'products/logs/frontend/generated/api.schemas'
import { logsRetentionRulesSettingsUrl } from 'products/logs/frontend/logsRetentionRulesSettingsUrl'

import type { logsRetentionFormLogicType } from './logsRetentionFormLogicType'

const EMPTY_FILTER_GROUP: UniversalFiltersGroup = {
    type: FilterLogicalOperator.And,
    values: [],
}

/** Retention tiers a rule may assign. Mirrors VALID_RETENTION_DAYS on the backend. */
export const RETENTION_DAYS_OPTIONS: number[] = [14, 30, 90]
const DEFAULT_RETENTION_DAYS = 30

export interface LogsRetentionFormType {
    name: string
    enabled: boolean
    retention_days: number
    filter_group: UniversalFiltersGroup
}

const DEFAULT_FORM: LogsRetentionFormType = {
    name: '',
    enabled: true,
    retention_days: DEFAULT_RETENTION_DAYS,
    filter_group: EMPTY_FILTER_GROUP,
}

/** Read either the wrapped `{type, values: [innerGroup]}` (logs-viewer/alerts shape) or the bare inner group. */
function extractFilterGroup(stored: unknown): UniversalFiltersGroup {
    if (!stored || typeof stored !== 'object') {
        return EMPTY_FILTER_GROUP
    }
    const candidate = stored as { type?: unknown; values?: unknown[] }
    if (!Array.isArray(candidate.values)) {
        return EMPTY_FILTER_GROUP
    }
    const first = candidate.values[0] as { type?: unknown; values?: unknown[] } | undefined
    if (first && Array.isArray(first.values) && typeof first.type === 'string') {
        return first as UniversalFiltersGroup
    }
    return candidate as UniversalFiltersGroup
}

/** Wrap inner group as the alerts / logs-viewer wire format expects. */
function wrapFilterGroup(inner: UniversalFiltersGroup): UniversalFiltersGroup {
    return { type: FilterLogicalOperator.And, values: [inner] as never }
}

export function isFilterGroupNonEmpty(group: UniversalFiltersGroup): boolean {
    return Array.isArray(group.values) && group.values.length > 0
}

export function buildRetentionFormDefaults(rule: LogsRetentionRuleApi | null): LogsRetentionFormType {
    if (!rule) {
        return { ...DEFAULT_FORM }
    }
    const cfg = (rule.config ?? {}) as Record<string, unknown>
    const storedDays = cfg.retention_days
    return {
        name: rule.name,
        enabled: rule.enabled ?? false,
        retention_days:
            typeof storedDays === 'number' && RETENTION_DAYS_OPTIONS.includes(storedDays)
                ? storedDays
                : DEFAULT_RETENTION_DAYS,
        filter_group: extractFilterGroup(cfg.filter_group),
    }
}

export function buildRetentionConfigPayload(form: LogsRetentionFormType): Record<string, unknown> {
    return {
        retention_days: form.retention_days,
        filter_group: wrapFilterGroup(form.filter_group),
    }
}

export interface LogsRetentionFormLogicProps {
    rule: LogsRetentionRuleApi | null
}

export const logsRetentionFormLogic = kea<logsRetentionFormLogicType>([
    path(['products', 'logs', 'frontend', 'components', 'LogsRetention', 'logsRetentionFormLogic']),
    props({} as LogsRetentionFormLogicProps),
    key(({ rule }) => rule?.id ?? 'new'),

    connect(() => ({
        values: [teamLogic, ['currentTeamId']],
    })),

    forms(({ props, values }) => ({
        retentionForm: {
            defaults: buildRetentionFormDefaults(props.rule),
            errors: (form: LogsRetentionFormType) => ({
                name: !form.name?.trim() ? 'Name is required' : undefined,
            }),
            submit: async (form: LogsRetentionFormType) => {
                const projectId = String(values.currentTeamId)
                try {
                    const payload = {
                        name: form.name.trim(),
                        enabled: form.enabled,
                        config: buildRetentionConfigPayload(form),
                    }
                    if (props.rule) {
                        const patch: PatchedLogsRetentionRuleApi = payload
                        await logsRetentionRulesPartialUpdate(projectId, props.rule.id, patch)
                        lemonToast.success('Retention rule updated')
                    } else {
                        await logsRetentionRulesCreate(projectId, payload as never)
                        lemonToast.success('Retention rule created')
                    }
                    router.actions.push(logsRetentionRulesSettingsUrl())
                } catch (e: any) {
                    lemonToast.error(e?.detail ?? e?.message ?? 'Failed to save rule')
                    throw e
                }
            },
        },
    })),
])
