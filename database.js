const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data.json');

function load() {
  if (!fs.existsSync(DB_PATH)) {
    return { users: [], products: [], orders: [], payments: [], nextIds: { users: 1, products: 1, orders: 1, payments: 1 } };
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

let data = load();

function initDefaults() {
  if (!data.users.some(u => u.role === 'admin')) {
    data.users.push({
      id: data.nextIds.users++,
      username: 'admin',
      email: 'gemstore25@gmail.com',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      balance: 0,
      created_at: new Date().toISOString(),
    });
  }
  if (!data.users.some(u => u.username === 'reseller')) {
    data.users.push({
      id: data.nextIds.users++,
      username: 'reseller',
      email: 'reseller@gemsmmpannel.com',
      password: bcrypt.hashSync('reseller123', 10),
      role: 'reseller',
      balance: 0,
      created_at: new Date().toISOString(),
    });
  }
  save(data);
}

initDefaults();

const db = {
  prepare(sql) {
    return {
      get(...params) { return db._query(sql, params, 'get'); },
      all(...params) { return db._query(sql, params, 'all'); },
      run(...params) { return db._query(sql, params, 'run'); },
    };
  },

  _query(sql, params, mode) {
    sql = sql.trim();

    if (sql.includes('SELECT id FROM users WHERE role = ?')) {
      const u = data.users.find(x => x.role === params[0]);
      return mode === 'get' ? (u ? { id: u.id } : undefined) : u;
    }

    if (sql.includes('SELECT id FROM users WHERE username = ?')) {
      const u = data.users.find(x => x.username === params[0]);
      return mode === 'get' ? (u ? { id: u.id } : undefined) : u;
    }

    if (sql.includes('SELECT COUNT(*) as count FROM users') && !sql.includes('role')) {
      return mode === 'get' ? { count: data.users.length } : data.users.length;
    }

    if (sql.includes("SELECT COUNT(*) as count FROM users WHERE role = 'customer'")) {
      const count = data.users.filter(u => u.role === 'customer').length;
      return mode === 'get' ? { count } : count;
    }

    if (sql.includes('SELECT COUNT(*) as count FROM orders')) {
      return mode === 'get' ? { count: data.orders.length } : data.orders.length;
    }

    if (sql.includes('SELECT COUNT(*) as count FROM products WHERE enabled = 1')) {
      const count = data.products.filter(p => p.enabled).length;
      return mode === 'get' ? { count } : count;
    }

    if (sql.includes("SELECT COUNT(*) as count FROM payments WHERE status = 'pending'")) {
      const count = data.payments.filter(p => p.status === 'pending').length;
      return mode === 'get' ? { count } : count;
    }

    if (sql.includes('SELECT COALESCE(SUM(charge), 0) as total FROM orders')) {
      const total = data.orders.reduce((s, o) => s + o.charge, 0);
      return mode === 'get' ? { total } : total;
    }

    if (sql.includes('INSERT INTO users')) {
      const [username, email, password, role, balance] = params;
      if (data.users.some(u => u.username === username || u.email === email)) {
        const err = new Error('UNIQUE constraint failed');
        err.code = 'SQLITE_CONSTRAINT_UNIQUE';
        throw err;
      }
      const user = {
        id: data.nextIds.users++,
        username, email, password,
        role: role || 'customer',
        balance: balance || 0,
        created_at: new Date().toISOString(),
      };
      data.users.push(user);
      save(data);
      return { lastInsertRowid: user.id };
    }

    if (sql.includes('SELECT * FROM users WHERE username = ? OR email = ?')) {
      const u = data.users.find(x => x.username === params[0] || x.email === params[1]);
      return mode === 'get' ? u : u ? [u] : [];
    }

    if (sql.includes('SELECT id, username, email, role, balance FROM users WHERE id = ?')) {
      const u = data.users.find(x => x.id === params[0]);
      if (!u) return mode === 'get' ? undefined : [];
      const r = { id: u.id, username: u.username, email: u.email, role: u.role, balance: u.balance };
      return mode === 'get' ? r : [r];
    }

    if (sql.includes('SELECT balance FROM users WHERE id = ?')) {
      const u = data.users.find(x => x.id === params[0]);
      return mode === 'get' ? (u ? { balance: u.balance } : undefined) : u;
    }

    if (sql.includes('SELECT * FROM users WHERE id = ?') && !sql.includes('role')) {
      const u = data.users.find(x => x.id === params[0]);
      return mode === 'get' ? u : u ? [u] : [];
    }

    if (sql.includes('UPDATE users SET balance = balance - ?')) {
      const u = data.users.find(x => x.id === params[1]);
      if (u) { u.balance -= params[0]; save(data); }
      return { changes: 1 };
    }

    if (sql.includes('UPDATE users SET balance = balance + ?')) {
      const u = data.users.find(x => x.id === params[1]);
      if (u) { u.balance += params[0]; save(data); }
      return { changes: 1 };
    }

    if (sql.includes('UPDATE users SET balance = ? WHERE id = ?')) {
      const u = data.users.find(x => x.id === params[1]);
      if (u) { u.balance = params[0]; save(data); }
      return { changes: 1 };
    }

    if (sql.includes('UPDATE users SET role = ? WHERE id = ?')) {
      const u = data.users.find(x => x.id === params[1]);
      if (u) { u.role = params[0]; save(data); }
      return { changes: 1 };
    }

    if (sql.includes('SELECT id, username, email, role, balance, created_at FROM users ORDER BY')) {
      const users = data.users.map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, balance: u.balance, created_at: u.created_at }));
      return mode === 'all' ? users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : users[0];
    }

    if (sql.includes("SELECT id, username, email, balance, created_at FROM users WHERE role = 'customer'")) {
      const users = data.users.filter(u => u.role === 'customer').map(u => ({ id: u.id, username: u.username, email: u.email, balance: u.balance, created_at: u.created_at }));
      return mode === 'all' ? users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : users[0];
    }

    if (sql.includes('SELECT * FROM products WHERE enabled = 1 ORDER BY')) {
      return mode === 'all' ? data.products.filter(p => p.enabled).sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name)) : data.products.find(p => p.enabled);
    }

    if (sql.includes('SELECT * FROM products ORDER BY')) {
      return mode === 'all' ? [...data.products].sort((a, b) => (a.category + a.name).localeCompare(b.category + b.name)) : data.products[0];
    }

    if (sql.includes('SELECT * FROM products WHERE id = ? AND enabled = 1')) {
      const p = data.products.find(x => x.id === parseInt(params[0]) && x.enabled);
      return mode === 'get' ? p : p ? [p] : [];
    }

    if (sql.includes('SELECT * FROM products WHERE id = ?') && !sql.includes('enabled')) {
      const p = data.products.find(x => x.id === parseInt(params[0]));
      return mode === 'get' ? p : p ? [p] : [];
    }

    if (sql.includes('SELECT id FROM products WHERE smm_service_id = ?')) {
      const p = data.products.find(x => x.smm_service_id === params[0]);
      return mode === 'get' ? (p ? { id: p.id } : undefined) : p;
    }

    if (sql.includes('INSERT INTO products')) {
      const [smm_service_id, name, category, type, rate, sell_price, reseller_price, min_qty, max_qty] = params;
      const product = {
        id: data.nextIds.products++,
        smm_service_id, name, category: category || '', type: type || 'Default',
        rate, sell_price,
        reseller_price: reseller_price != null ? reseller_price : +(sell_price * 0.9).toFixed(2),
        min_qty, max_qty, enabled: 1,
        created_at: new Date().toISOString(),
      };
      data.products.push(product);
      save(data);
      return { lastInsertRowid: product.id };
    }

    if (sql.includes('UPDATE products SET')) {
      const p = data.products.find(x => x.id === parseInt(params[params.length - 1]));
      if (p) {
        const [name, category, type, rate, sell_price, reseller_price, min_qty, max_qty, enabled, id] = params;
        Object.assign(p, {
          name, category, type, rate, sell_price,
          reseller_price: reseller_price != null ? reseller_price : +(sell_price * 0.9).toFixed(2),
          min_qty, max_qty, enabled,
        });
        save(data);
      }
      return { changes: 1 };
    }

    if (sql.includes('DELETE FROM products WHERE id = ?')) {
      data.products = data.products.filter(x => x.id !== parseInt(params[0]));
      save(data);
      return { changes: 1 };
    }

    if (sql.includes('INSERT INTO orders')) {
      const [user_id, product_id, smm_order_id, link, quantity, charge, status] = params;
      const order = {
        id: data.nextIds.orders++,
        user_id, product_id, smm_order_id, link, quantity, charge, status,
        created_at: new Date().toISOString(),
      };
      data.orders.push(order);
      save(data);
      return { lastInsertRowid: order.id };
    }

    if (sql.includes('UPDATE orders SET status = ? WHERE id = ?')) {
      const o = data.orders.find(x => x.id === params[1]);
      if (o) { o.status = params[0]; save(data); }
      return { changes: 1 };
    }

    if (sql.includes('SELECT * FROM orders WHERE id = ? AND user_id = ?')) {
      const o = data.orders.find(x => x.id === parseInt(params[0]) && x.user_id === params[1]);
      return mode === 'get' ? o : o ? [o] : [];
    }

    if (sql.includes('FROM orders o') && sql.includes('WHERE o.user_id = ?')) {
      const orders = data.orders.filter(o => o.user_id === params[0]).map(o => {
        const p = data.products.find(pr => pr.id === o.product_id);
        return { ...o, product_name: p ? p.name : 'Unknown' };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
      return mode === 'all' ? orders : orders[0];
    }

    if (sql.includes('FROM orders o') && sql.includes('JOIN users u') && sql.includes('LIMIT 200')) {
      const orders = data.orders.map(o => {
        const p = data.products.find(pr => pr.id === o.product_id);
        const u = data.users.find(us => us.id === o.user_id);
        return { ...o, product_name: p ? p.name : 'Unknown', username: u ? u.username : 'Unknown' };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 200);
      return mode === 'all' ? orders : orders[0];
    }

    if (sql.includes('FROM orders o') && sql.includes('JOIN users u') && sql.includes('LIMIT 100')) {
      const orders = data.orders.map(o => {
        const p = data.products.find(pr => pr.id === o.product_id);
        const u = data.users.find(us => us.id === o.user_id);
        return { ...o, product_name: p ? p.name : 'Unknown', username: u ? u.username : 'Unknown' };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
      return mode === 'all' ? orders : orders[0];
    }

    if (sql.includes('INSERT INTO payments')) {
      const [user_id, amount, txn_id, screenshot_path] = params;
      const payment = {
        id: data.nextIds.payments++,
        user_id, amount, txn_id, screenshot_path, status: 'pending',
        admin_note: null,
        created_at: new Date().toISOString(),
      };
      data.payments.push(payment);
      save(data);
      return { lastInsertRowid: payment.id };
    }

    if (sql.includes('FROM payments WHERE user_id = ? ORDER BY')) {
      const payments = data.payments.filter(p => p.user_id === params[0])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(p => ({ id: p.id, amount: p.amount, txn_id: p.txn_id, screenshot_path: p.screenshot_path, status: p.status, admin_note: p.admin_note, created_at: p.created_at }));
      return mode === 'all' ? payments : payments[0];
    }

    if (sql.includes("FROM payments p JOIN users u") && sql.includes("status = 'pending'")) {
      const payments = data.payments.filter(p => p.status === 'pending').map(p => {
        const u = data.users.find(us => us.id === p.user_id);
        return { ...p, username: u ? u.username : '', email: u ? u.email : '' };
      }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      return mode === 'all' ? payments : payments[0];
    }

    if (sql.includes('SELECT * FROM payments WHERE id = ?')) {
      const p = data.payments.find(x => x.id === parseInt(params[0]));
      return mode === 'get' ? p : p ? [p] : [];
    }

    if (sql.includes('UPDATE payments SET status = ?, admin_note = ? WHERE id = ?')) {
      const p = data.payments.find(x => x.id === parseInt(params[2]));
      if (p) { p.status = params[0]; p.admin_note = params[1]; save(data); }
      return { changes: 1 };
    }

    return mode === 'get' ? undefined : mode === 'all' ? [] : { changes: 0 };
  },
};

module.exports = db;
