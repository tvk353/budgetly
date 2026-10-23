'use client';

import { useState } from 'react';
import { DashboardIcon } from '@/components/dashboard-icon';
import { formatInrPaise } from '@/lib/household-dashboard-data';
import { parseInrAmountToPaise, type RefundableExpense } from '@/lib/transactions-data';

const suggestedLabels = [
  'Amazon',
  'Flipkart',
  'Reliance',
  'Zepto',
  'Swiggy',
  'Zomato',
  'Blinkit',
  'Airtel',
  'Bigbasket',
  'Breakfast',
  'Dinner',
  'Lunch',
  'Car',
  'Cash',
  'Chicken',
  'Eggs',
  'Vegetables',
  'Electricity',
  'Fish',
  'Mutton',
  'Gas',
  'Gym',
  'Salon',
  'JioMart',
  'Medicines',
  'Myntra',
  'Nykaa',
  'Ola',
  'Uber',
  'Rapido',
  "Sid's Farm",
  'Swimming',
  'Teeth',
  'Urban Company',
];

const iconOptions = [
  { name: 'cart', label: 'Shopping cart' },
  { name: 'shopping-bag', label: 'Shopping bag' },
  { name: 'dining', label: 'Food / dining' },
  { name: 'bolt', label: 'Electricity' },
  { name: 'gas', label: 'Fuel / gas' },
  { name: 'home', label: 'Home' },
  { name: 'medicine', label: 'Healthcare' },
  { name: 'movie', label: 'Entertainment' },
  { name: 'commute', label: 'Transport' },
  { name: 'kitchen', label: 'Household' },
  { name: 'activity', label: 'Activity' },
  { name: 'receipt', label: 'Receipt' },
  { name: 'savings', label: 'Savings' },
  { name: 'users', label: 'People / services' },
  { name: 'plus', label: 'General' },
] as const;

type IconOption = (typeof iconOptions)[number]['name'];
type CategoryOption = { name: string; icon: IconOption };
type LabelOption = { name: string; icon: IconOption };

const initialCategories: CategoryOption[] = [
  { name: 'Groceries', icon: 'cart' },
  { name: 'Dining', icon: 'dining' },
  { name: 'Utilities', icon: 'bolt' },
  { name: 'Transport', icon: 'gas' },
  { name: 'Home & Living', icon: 'home' },
  { name: 'Healthcare', icon: 'medicine' },
  { name: 'Shopping', icon: 'shopping-bag' },
  { name: 'Entertainment', icon: 'movie' },
];

const labelIconFor = (label: string): IconOption => {
  const name = label.toLowerCase();
  if (/amazon|flipkart|reliance|blinkit|bigbasket|zepto|jiomart|myntra|nykaa/.test(name))
    return 'shopping-bag';
  if (/swiggy|zomato|breakfast|dinner|lunch|chicken|eggs|vegetables|fish|mutton|farm/.test(name))
    return 'dining';
  if (/electricity|airtel|jio/.test(name)) return 'bolt';
  if (/car|ola|uber|rapido/.test(name)) return 'commute';
  if (/cash/.test(name)) return 'receipt';
  if (/medicine|teeth/.test(name)) return 'medicine';
  if (/gas/.test(name)) return 'gas';
  if (/gym|swimming/.test(name)) return 'activity';
  if (/urban company|salon/.test(name)) return 'users';
  return 'cart';
};

export interface NewExpenseInput {
  amountPaise: number;
  category: string;
  label?: string;
  date: string;
  description: string;
  notes: string;
}

export interface NewRefundInput extends NewExpenseInput {
  linkedExpenseId?: string;
}

type TransactionEntrySheetProps =
  | {
      mode: 'expense';
      todayKey: string;
      onClose: () => void;
      onSave: (expense: NewExpenseInput) => void;
    }
  | {
      mode: 'refund';
      todayKey: string;
      refundableExpenses: RefundableExpense[];
      onClose: () => void;
      onSave: (refund: NewRefundInput) => void;
    };

export function AddExpenseSheet({
  todayKey,
  onClose,
  onSave,
}: {
  todayKey: string;
  onClose: () => void;
  onSave: (expense: NewExpenseInput) => void;
}) {
  return (
    <TransactionEntrySheet mode="expense" todayKey={todayKey} onClose={onClose} onSave={onSave} />
  );
}

export function AddRefundSheet({
  todayKey,
  refundableExpenses,
  onClose,
  onSave,
}: {
  todayKey: string;
  refundableExpenses: RefundableExpense[];
  onClose: () => void;
  onSave: (refund: NewRefundInput) => void;
}) {
  return (
    <TransactionEntrySheet
      mode="refund"
      todayKey={todayKey}
      refundableExpenses={refundableExpenses}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function TransactionEntrySheet(props: TransactionEntrySheetProps) {
  const { mode, todayKey, onClose } = props;
  const isRefund = mode === 'refund';
  const refundableExpenses = mode === 'refund' ? props.refundableExpenses : [];
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>(initialCategories);
  const [category, setCategory] = useState('');
  const [categoryIcon, setCategoryIcon] = useState<IconOption>('cart');
  const [labels, setLabels] = useState<LabelOption[]>(
    suggestedLabels.map((name) => ({ name, icon: labelIconFor(name) })),
  );
  const [label, setLabel] = useState('');
  const [labelIcon, setLabelIcon] = useState<IconOption>('shopping-bag');
  const [addingCategory, setAddingCategory] = useState(false);
  const [addingLabel, setAddingLabel] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState<IconOption>('cart');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelIcon, setNewLabelIcon] = useState<IconOption>('shopping-bag');
  const [date, setDate] = useState(todayKey);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [refundType, setRefundType] = useState<'linked' | 'unlinked'>('linked');
  const [linkedExpenseId, setLinkedExpenseId] = useState('');

  const amountPaise = parseInrAmountToPaise(amount) ?? 0;
  const validAmount = amountPaise > 0;
  const selectedExpense = refundableExpenses.find((expense) => expense.id === linkedExpenseId);
  const linkedRefund = isRefund && refundType === 'linked';
  const effectiveCategory = linkedRefund ? (selectedExpense?.category ?? '') : category;

  function addCategory() {
    const name = newCategoryName.trim();
    if (!name || categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    setCategories((current) => [...current, { name, icon: newCategoryIcon }]);
    setCategory(name);
    setCategoryIcon(newCategoryIcon);
    setNewCategoryName('');
    setAddingCategory(false);
    setError('');
  }

  function addLabel() {
    const name = newLabelName.trim();
    if (!name || labels.some((item) => item.name.toLowerCase() === name.toLowerCase())) return;
    setLabels((current) => [...current, { name, icon: newLabelIcon }]);
    setLabel(name);
    setLabelIcon(newLabelIcon);
    setNewLabelName('');
    setAddingLabel(false);
  }

  function save() {
    if (!validAmount) {
      setError('Enter an amount greater than ₹0 with up to two decimal places.');
      return;
    }
    if (linkedRefund && !selectedExpense) {
      setError('Choose an expense with a remaining refundable amount, or select Unlinked Refund.');
      return;
    }
    if (linkedRefund && selectedExpense && amountPaise > selectedExpense.remainingPaise) {
      setError(
        `Refund cannot exceed the remaining ${formatInrPaise(selectedExpense.remainingPaise)}.`,
      );
      return;
    }
    if (!effectiveCategory) {
      setError('Choose a category.');
      return;
    }
    if (!date || date > todayKey) {
      setError('Choose today or an earlier date.');
      return;
    }

    const input = {
      amountPaise,
      category: effectiveCategory,
      label: label.trim(),
      date,
      description: description.trim(),
      notes: notes.trim(),
    };
    if (mode === 'refund') {
      props.onSave({
        ...input,
        linkedExpenseId: linkedRefund ? selectedExpense?.id : undefined,
      });
    } else {
      props.onSave(input);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-expense-title"
        className="flex max-h-[94dvh] w-full max-w-[393px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-main-text)] shadow-2xl sm:rounded-[28px]"
        style={{
          fontFamily:
            'Manrope Variable, Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-white/90 px-5 py-3 backdrop-blur-md">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-1 text-sm text-[var(--color-secondary-text)]"
          >
            Cancel
          </button>
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className="mb-1 h-1 w-9 rounded-full bg-[var(--color-border)]"
            />
            <h2 id="add-expense-title" className="text-[17px] font-bold">
              {isRefund ? 'Add Refund' : 'Add Expense'}
            </h2>
          </div>
          <button
            type="button"
            onClick={save}
            className="min-h-11 px-1 text-sm font-bold text-[var(--color-primary)]"
          >
            Save
          </button>
        </header>

        <div className="overflow-y-auto px-5 pb-6">
          <div className="flex justify-center pt-3">
            <span className="rounded-full border border-[var(--color-border)] bg-[#e5f0eb] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-secondary-text)]">
              Posting to <span className="text-[var(--color-primary)]">🏠 Household</span>
            </span>
          </div>

          {isRefund && (
            <section className="space-y-2">
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-[var(--color-border)] bg-[#e5f0eb] p-1">
                {(
                  [
                    ['linked', 'Linked to Expense'],
                    ['unlinked', 'Unlinked Refund'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={refundType === value}
                    onClick={() => {
                      setRefundType(value);
                      setError('');
                    }}
                    className={`min-h-10 rounded-lg px-2 text-xs font-semibold ${refundType === value ? 'bg-[var(--color-primary)] text-white shadow-sm' : 'text-[var(--color-secondary-text)]'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-secondary-text)]">
                Linked refunds restore budget to the original expense category.
              </p>
              {linkedRefund && (
                <div className="space-y-3 rounded-2xl border border-[var(--color-border)] bg-white p-4">
                  <label htmlFor="refund-expense" className="block text-[13px] font-bold">
                    Select expense <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="refund-expense"
                    value={linkedExpenseId}
                    onChange={(event) => {
                      setLinkedExpenseId(event.target.value);
                      setError('');
                    }}
                    className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
                  >
                    <option value="">Choose an expense</option>
                    {refundableExpenses.map((expense) => (
                      <option key={expense.id} value={expense.id}>
                        {expense.description} · Remaining {formatInrPaise(expense.remainingPaise)}
                      </option>
                    ))}
                  </select>
                  {selectedExpense ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-3 text-xs">
                        <div>
                          <span className="block text-[var(--color-secondary-text)]">Original</span>
                          <span className="font-semibold">
                            {formatInrPaise(selectedExpense.amountPaise)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[var(--color-secondary-text)]">Refunded</span>
                          <span className="font-semibold">
                            {formatInrPaise(selectedExpense.refundedPaise)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[var(--color-primary)]">Remaining</span>
                          <span className="font-bold text-[var(--color-primary)]">
                            {formatInrPaise(selectedExpense.remainingPaise)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAmount((selectedExpense.remainingPaise / 100).toFixed(2));
                          setError('');
                        }}
                        className="min-h-10 w-full rounded-xl bg-[#e7f1ec] px-3 text-sm font-semibold text-[var(--color-primary)]"
                      >
                        Refund Full Amount ({formatInrPaise(selectedExpense.remainingPaise)})
                      </button>
                      <p className="text-xs text-[var(--color-secondary-text)]">
                        Refund cannot exceed the remaining{' '}
                        {formatInrPaise(selectedExpense.remainingPaise)}.
                      </p>
                    </>
                  ) : (
                    <p className="text-xs text-[var(--color-secondary-text)]">
                      No refundable amount remains on the available expenses.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          <section className="flex flex-col items-center py-4">
            <label
              htmlFor={isRefund ? 'refund-amount' : 'expense-amount'}
              className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-secondary-text)]"
            >
              {isRefund ? 'Refund Amount' : 'Amount'}
            </label>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-[var(--color-primary)]">₹</span>
              <input
                id={isRefund ? 'refund-amount' : 'expense-amount'}
                aria-label="Amount"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(event) => {
                  const value = event.target.value;
                  if (/^\d*\.?\d{0,2}$/.test(value)) setAmount(value);
                  setError('');
                }}
                placeholder="0.00"
                className="w-[210px] border-0 bg-transparent p-0 text-center text-[36px] font-bold leading-[44px] tracking-tight text-[var(--color-main-text)] outline-none placeholder:text-[#b5bdb8] focus:ring-0"
              />
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {[100, 500, 1000].map((increment) => (
                <button
                  key={increment}
                  type="button"
                  onClick={() => {
                    const next = (Math.max(0, Number(amount) || 0) + increment).toFixed(2);
                    setAmount(next);
                    setError('');
                  }}
                  className="rounded-full border border-[var(--color-border)] bg-[#e5f0eb] px-3 py-1.5 text-xs font-semibold"
                >
                  +₹{increment.toLocaleString('en-IN')}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setAmount('');
                  setError('');
                }}
                className="rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 text-xs text-[var(--color-secondary-text)]"
              >
                Clear
              </button>
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-secondary-text)]">
              Maximum two decimal places
            </p>
          </section>

          <section className="space-y-2">
            <label htmlFor="expense-category" className="block text-[13px] font-bold">
              Category <span className="text-red-600">*</span>
            </label>
            {linkedRefund && selectedExpense && (
              <p className="flex items-center gap-1 text-[11px] text-[var(--color-secondary-text)]">
                <DashboardIcon name="lock" className="h-3.5 w-3.5" />
                Inherited from the linked expense
              </p>
            )}
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                {effectiveCategory && (
                  <DashboardIcon
                    name={
                      categories.find((item) => item.name === effectiveCategory)?.icon ??
                      categoryIcon
                    }
                    className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--color-secondary-text)]"
                  />
                )}
                <select
                  id="expense-category"
                  value={effectiveCategory}
                  disabled={linkedRefund}
                  onChange={(event) => {
                    const selected = categories.find((item) => item.name === event.target.value);
                    setCategory(event.target.value);
                    if (selected) setCategoryIcon(selected.icon);
                    setError('');
                  }}
                  className={`min-h-11 w-full appearance-none rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 disabled:bg-[#f0f2ef] disabled:text-[var(--color-secondary-text)] ${effectiveCategory ? 'pl-10' : ''}`}
                >
                  <option value="">Select category</option>
                  {categories.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              {!linkedRefund && (
                <button
                  type="button"
                  aria-label="Add custom category"
                  onClick={() => setAddingCategory((value) => !value)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary)] bg-[#e7f1ec] text-[var(--color-primary)]"
                >
                  <DashboardIcon name="plus" />
                </button>
              )}
            </div>
            {addingCategory && !linkedRefund && (
              <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
                <label htmlFor="new-category-name" className="text-xs font-semibold">
                  New category name
                </label>
                <input
                  id="new-category-name"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. Pets"
                  className="min-h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm"
                />
                <label htmlFor="new-category-icon" className="text-xs font-semibold">
                  Choose icon
                </label>
                <div className="flex gap-2">
                  <select
                    id="new-category-icon"
                    value={newCategoryIcon}
                    onChange={(event) => setNewCategoryIcon(event.target.value as IconOption)}
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm"
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon.name} value={icon.name}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7f1ec] text-[var(--color-primary)]">
                    <DashboardIcon name={newCategoryIcon} />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addCategory}
                  disabled={
                    !newCategoryName.trim() ||
                    categories.some(
                      (item) => item.name.toLowerCase() === newCategoryName.trim().toLowerCase(),
                    )
                  }
                  className="min-h-10 w-full rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white disabled:opacity-50"
                >
                  Create category
                </button>
              </div>
            )}
          </section>

          <section className="mt-5 space-y-2">
            <label htmlFor="expense-label" className="block text-[13px] font-bold">
              Label{' '}
              <span className="font-normal text-[var(--color-secondary-text)]">(Optional)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1">
                {label && (
                  <DashboardIcon
                    name={labels.find((item) => item.name === label)?.icon ?? labelIcon}
                    className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-[var(--color-secondary-text)]"
                  />
                )}
                <select
                  id="expense-label"
                  value={label}
                  onChange={(event) => {
                    const selected = labels.find((item) => item.name === event.target.value);
                    setLabel(event.target.value);
                    if (selected) setLabelIcon(selected.icon);
                  }}
                  className={`min-h-11 w-full appearance-none rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 ${label ? 'pl-10' : ''}`}
                >
                  <option value="">Select label (optional)</option>
                  {labels.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                aria-label="Add custom label"
                onClick={() => setAddingLabel((value) => !value)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary)] bg-[#e7f1ec] text-[var(--color-primary)]"
              >
                <DashboardIcon name="plus" />
              </button>
            </div>
            {addingLabel && (
              <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-white p-3">
                <label htmlFor="new-label-name" className="text-xs font-semibold">
                  New label name
                </label>
                <input
                  id="new-label-name"
                  value={newLabelName}
                  onChange={(event) => setNewLabelName(event.target.value)}
                  maxLength={40}
                  placeholder="e.g. Local Store"
                  className="min-h-10 w-full rounded-lg border border-[var(--color-border)] px-3 text-sm"
                />
                <label htmlFor="new-label-icon" className="text-xs font-semibold">
                  Choose icon
                </label>
                <div className="flex gap-2">
                  <select
                    id="new-label-icon"
                    value={newLabelIcon}
                    onChange={(event) => setNewLabelIcon(event.target.value as IconOption)}
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-white px-2 text-sm"
                  >
                    {iconOptions.map((icon) => (
                      <option key={icon.name} value={icon.name}>
                        {icon.label}
                      </option>
                    ))}
                  </select>
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#e7f1ec] text-[var(--color-primary)]">
                    <DashboardIcon name={newLabelIcon} />
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addLabel}
                  disabled={
                    !newLabelName.trim() ||
                    labels.some(
                      (item) => item.name.toLowerCase() === newLabelName.trim().toLowerCase(),
                    )
                  }
                  className="min-h-10 w-full rounded-full bg-[var(--color-primary)] text-sm font-semibold text-white disabled:opacity-50"
                >
                  Create label
                </button>
              </div>
            )}
            <p className="text-[11px] text-[var(--color-secondary-text)]">
              Labels are reusable across all categories.
            </p>
          </section>

          <section className="mt-5 space-y-2">
            <label htmlFor="expense-date" className="block text-[13px] font-bold">
              Date
            </label>
            <input
              id="expense-date"
              aria-label="Date"
              type="date"
              value={date}
              max={todayKey}
              onChange={(event) => {
                setDate(event.target.value);
                setError('');
              }}
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <p className="text-[11px] text-[var(--color-secondary-text)]">
              Future dates are not allowed.
            </p>
          </section>

          <section className="mt-5 space-y-2">
            <label htmlFor="expense-description" className="block text-[13px] font-bold">
              Description{' '}
              <span className="font-normal text-[var(--color-secondary-text)]">(Optional)</span>
            </label>
            <input
              id="expense-description"
              maxLength={50}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={isRefund ? 'What was refunded?' : 'What did you spend on?'}
              className="min-h-11 w-full rounded-xl border border-[var(--color-border)] bg-white px-3 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <p className="text-right text-[11px] text-[var(--color-secondary-text)]">
              {description.length}/50
            </p>
          </section>

          <section className="mt-3 space-y-2">
            <label htmlFor="expense-notes" className="block text-[13px] font-bold">
              Notes{' '}
              <span className="font-normal text-[var(--color-secondary-text)]">(Optional)</span>
            </label>
            <textarea
              id="expense-notes"
              maxLength={500}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add any details..."
              className="w-full resize-none rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5 text-sm focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
            />
            <p className="text-right text-[11px] text-[var(--color-secondary-text)]">
              {notes.length}/500
            </p>
          </section>

          {isRefund && (
            <section
              aria-label="Budget impact"
              className="mt-4 rounded-xl border border-[#a4d9bd] bg-[#e7f1ec] p-3.5"
            >
              <p className="text-sm font-bold text-[var(--color-primary)]">Budget Impact</p>
              <p className="mt-1 text-xs leading-5 text-[var(--color-secondary-text)]">
                {validAmount ? formatInrPaise(amountPaise) : 'The refund amount'} will be credited
                back to your{' '}
                {date
                  ? new Intl.DateTimeFormat('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      month: 'long',
                    }).format(new Date(`${date}T12:00:00+05:30`))
                  : 'selected month'}{' '}
                Available Budget and deducted from net expenses.
              </p>
            </section>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={save}
            className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(23,107,87,0.2)]"
          >
            {isRefund ? 'Save Refund' : 'Save Expense'}
            {validAmount ? ` • ${formatInrPaise(amountPaise)}` : ''}
          </button>
        </div>
      </section>
    </div>
  );
}
