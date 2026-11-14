document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('finance-date');
    const amountInput = document.getElementById('finance-amount');
    const categoryInput = document.getElementById('finance-category');
    const addButton = document.getElementById('finance-add');
    const status = document.getElementById('finance-status');
    const recentList = document.getElementById('finance-recent');

    // Default date to today
    dateInput.value = new Date().toISOString().split('T')[0];

    // Load categories from the database
    async function loadCategories() {
        try {
            const response = await fetch('/api/finance/categories');
            if (!response.ok) throw new Error('Could not load categories');

            const categories = await response.json();

            categoryInput.innerHTML = '<option value="">Choose a category</option>';

            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryInput.appendChild(option);
            });
        } catch (error) {
            status.textContent = error.message;
        }
    }

    // Load the five most recent transactions
    async function loadRecent() {
        try {
            const response = await fetch('/api/finance/recent');
            if (!response.ok) throw new Error('Could not load transactions');

            const transactions = await response.json();

            recentList.innerHTML = '';

            if (transactions.length === 0) {
                recentList.textContent = 'No expenses recorded yet.';
                return;
            }

            transactions.forEach(transaction => {
                const item = document.createElement('div');
                item.className = 'finance-transaction';

                const date = document.createElement('span');
                date.textContent = transaction.date;

                const category = document.createElement('span');
                category.textContent = transaction.category;

                const amount = document.createElement('span');
                amount.textContent =
                    '£' + (transaction.amount_pence / 100).toFixed(2);

                item.append(date, category, amount);
                recentList.appendChild(item);
            });
        } catch (error) {
            recentList.textContent = error.message;
        }
    }

    // Save a new expense
    async function addTransaction() {
        const date = dateInput.value;
        const amount = amountInput.value;
        const category = categoryInput.value;

        if (!date || !amount || !category) {
            status.textContent = 'Please complete all three fields.';
            return;
        }

        addButton.disabled = true;
        status.textContent = 'Saving...';

        try {
            const response = await fetch('/api/finance/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ date, amount, category })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Could not save expense');
            }

            status.textContent = 'Expense saved.';
            amountInput.value = '';
            categoryInput.value = '';

            await loadRecent();

        } catch (error) {
            status.textContent = error.message;
        } finally {
            addButton.disabled = false;
        }
    }

    addButton.addEventListener('click', addTransaction);

    loadCategories();
    loadRecent();
});