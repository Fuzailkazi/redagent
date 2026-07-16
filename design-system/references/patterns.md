# Patterns

Patterns are how primitives combine into the recurring shapes of an ArmorIQ screen. Reach for a pattern before inventing layout. Each entry: when to use, which primitives, and a short sketch. All imports are from `@shared/ui`.

## List + toolbar

**When:** any collection screen (members, agents, servers, policies).

**Primitives:** `ListToolbar` (tabs + filters + search + view toggle + count) over a stack of `ListRow`s.

```tsx
<ListToolbar
  tabs={tabs}
  search={{ value, onChange }}
  view={{ mode, onChange }}
  count={{ value: rows.length }}
/>;
{
  rows.map((r) => (
    <ListRow key={r.id} density="comfortable">
      {/* cells */}
    </ListRow>
  ));
}
```

Use `SortControl` inside the toolbar when rows are sortable; `ViewToggle` for list/grid.

## Form layout

**When:** create/edit forms, settings.

**Primitives:** `FormField` wrapping each control, `Button` for submit, with `react-hook-form` + `zod`.

```tsx
<form onSubmit={handleSubmit(onSubmit)}>
  <FormField label="Name" error={errors.name?.message}>
    <input {...register('name')} />
  </FormField>
  <Button variant="primary" type="submit" loading={isSubmitting}>
    Save
  </Button>
</form>
```

`FormField` owns the label, help text, and error slot, so the control stays bare. Use `SearchField`, `OTPInput`, `Toggle`, `UploadTarget` as the control where they fit.

## Page states

**When:** every async screen. There are exactly four states.

**Primitive:** `PageState` (kinds: loading, empty, error, content).

```tsx
if (query.isLoading) return <PageState kind="loading" />;
if (query.isError) return <PageState kind="error" onRetry={query.refetch} />;
if (!data.length)
  return <PageState kind="empty" title="No agents yet" action={<Button>Add agent</Button>} />;
return <ListView data={data} />;
```

Never ship a bare spinner or a blank screen; route through `PageState`.

## Modal vs side modal

**When:** a focused task overlaying the page.

**Primitives:** `Modal` for short, centered confirmations and create dialogs (`ModalPrimaryButton` / `ModalSecondaryButton` for the footer). `SideModal` for detail views and longer edit flows that benefit from a tall right-side drawer while keeping page context visible.

```tsx
<Modal
  open={open}
  onClose={close}
  tone="danger"
  footer={
    <>
      <ModalSecondaryButton onClick={close}>Cancel</ModalSecondaryButton>
      <ModalPrimaryButton onClick={confirm}>Delete</ModalPrimaryButton>
    </>
  }
>
  Are you sure?
</Modal>
```

Rule of thumb: a yes/no or one-field action -> `Modal`; inspect-or-edit-a-record -> `SideModal`.

## Section header + content

**When:** dividing a page or a card into titled regions.

**Primitives:** `SectionHeader` above the content block; wrap related blocks in `SettingCard` on settings screens.

```tsx
<SectionHeader title="Authentication" actions={<Button variant="tertiary">Edit</Button>} />
<SettingCard tone="default" saveState={saveState}>{/* fields */}</SettingCard>
```

## View switching

**When:** the same data has multiple presentations or sub-views.

**Primitives:** `SegmentedControl` for 2-3 mutually exclusive views, `Tabs` / `TabRail` for named sub-pages, `ViewToggle` for list/grid.

```tsx
<SegmentedControl
  options={[
    { value: 'graph', label: 'Graph' },
    { value: 'table', label: 'Table' },
  ]}
  value={view}
  onChange={setView}
/>
```

## Status communication

**When:** conveying health, state, or outcome.

**Primitives:** `StatusBadge` for read-only state on a row, `StatusChip` when the status carries an action, `Banner` for a page-level message.

```tsx
<StatusBadge tone="good">Active</StatusBadge>
<StatusChip tone="warn" action={{ label: 'Review', onClick }}>Needs review</StatusChip>
<Banner tone="bad">Connection failed. Retrying.</Banner>
```

Keep tones consistent with the status family: good/warn/bad/info map 1:1 to the `aq-good|warn|bad|info` tokens.
