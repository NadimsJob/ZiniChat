'use client';

import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useLanguage } from '@/components/LanguageProvider';
import { ShoppingBag, ChevronLeft, RefreshCw, Filter, Search, Package, CheckCircle2, XCircle, Clock, RotateCcw, Plus, X, Trash2, Building2 } from 'lucide-react';
import { format } from 'date-fns';

export default function OrdersPage() {
 const { language } = useLanguage();
 const [orders, setOrders] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [selectedOrder, setSelectedOrder] = useState<any>(null);
 const [statusUpdating, setStatusUpdating] = useState(false);
 const [isPropertyMode, setIsPropertyMode] = useState(false);

 // Create Order Modal State
 const [isCreatingOrder, setIsCreatingOrder] = useState(false);
 const [contacts, setContacts] = useState<any[]>([]);
 const [products, setProducts] = useState<any[]>([]);
 const [selectedContactId, setSelectedContactId] = useState('');
 const [orderItems, setOrderItems] = useState<{ productId: string; quantity: number; priceAtTime: string }[]>([]);
 const [orderNotes, setOrderNotes] = useState('');
 const [isSubmitting, setIsSubmitting] = useState(false);

 useEffect(() => {
 fetchOrders();
 fetchPropertyMode();
 }, []);

 const fetchPropertyMode = async () => {
 try {
 const token = Cookies.get('access_token');
 const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
 const [meRes, bnRes] = await Promise.all([
 fetch(`${API}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } }),
 fetch(`${API}/business-natures`),
 ]);
 if (meRes.ok && bnRes.ok) {
 const meData = await meRes.json();
 const natures: any[] = await bnRes.json();
 const tenantNature = meData?.tenant?.businessNature || '';
 const matched = natures.find((n: any) => n.name === tenantNature);
 setIsPropertyMode(matched?.isPropertyMode ?? false);
 }
 } catch (err) {
 console.error(err);
 }
 };

 const fetchOrders = async () => {
 try {
 const token = Cookies.get('access_token');
 const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/orders`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (res.ok) {
 const data = await res.json();
 setOrders(data);
 if (selectedOrder) {
 const updated = data.find((o: any) => o.id === selectedOrder.id);
 if (updated) setSelectedOrder(updated);
 }
 }
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 const fetchContactsAndProducts = async () => {
 try {
 const token = Cookies.get('access_token');
 const [cRes, pRes] = await Promise.all([
 fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/leads`, { headers: { 'Authorization': `Bearer ${token}` } }),
 fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/products`, { headers: { 'Authorization': `Bearer ${token}` } })
 ]);
 if (cRes.ok) setContacts(await cRes.json());
 if (pRes.ok) setProducts(await pRes.json());
 } catch (e) {
 console.error(e);
 }
 };

 useEffect(() => {
 if (isCreatingOrder && contacts.length === 0) {
 fetchContactsAndProducts();
 }
 }, [isCreatingOrder]);

 const updateStatus = async (status: string) => {
 if (!selectedOrder) return;
 setStatusUpdating(true);
 try {
 const token = Cookies.get('access_token');
 const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/orders/${selectedOrder.id}/status`, {
 method: 'PATCH',
 headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
 body: JSON.stringify({ status })
 });
 if (res.ok) {
 fetchOrders();
 }
 } catch (err) {
 console.error(err);
 } finally {
 setStatusUpdating(false);
 }
 };

 const handleAddOrderItem = () => {
 setOrderItems([...orderItems, { productId: '', quantity: 1, priceAtTime: '0' }]);
 };

 const handleUpdateOrderItem = (index: number, field: string, value: string | number) => {
 const newItems = [...orderItems];
 if (field === 'productId') {
 const prod = products.find(p => p.id === value);
 newItems[index].productId = value as string;
 if (prod) newItems[index].priceAtTime = prod.price;
 } else {
 (newItems[index] as any)[field] = value;
 }
 setOrderItems(newItems);
 };

 const handleRemoveOrderItem = (index: number) => {
 setOrderItems(orderItems.filter((_, i) => i !== index));
 };

 const handleCreateOrder = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!selectedContactId || orderItems.length === 0) return;
 const validItems = orderItems.filter(i => i.productId && i.quantity > 0);
 if (validItems.length === 0) return;

 setIsSubmitting(true);
 try {
 const token = Cookies.get('access_token');
 const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/orders`, {
 method: 'POST',
 headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
 body: JSON.stringify({
 contactId: selectedContactId,
 items: validItems,
 notes: orderNotes
 })
 });
 if (res.ok) {
 setIsCreatingOrder(false);
 setSelectedContactId('');
 setOrderItems([]);
 setOrderNotes('');
 fetchOrders();
 }
 } catch (err) {
 console.error(err);
 } finally {
 setIsSubmitting(false);
 }
 };

 const getStatusBadge = (status: string) => {
 const s = status.toLowerCase();
 if (s === 'pending') return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit"><Clock className="w-3 h-3" /> Pending</span>;
 if (s === 'confirmed') return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Confirmed</span>;
 if (s === 'processing') return <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit"><Package className="w-3 h-3" /> Processing</span>;
 if (s === 'shipped') return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit"><Package className="w-3 h-3" /> Shipped</span>;
 if (s === 'delivered') return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit"><CheckCircle2 className="w-3 h-3" /> Delivered</span>;
 if (s === 'cancelled') return <span className="px-2 py-1 bg-red-100 text-red-700 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit"><XCircle className="w-3 h-3" /> Cancelled</span>;
 if (s === 'refunded') return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[11px] font-bold rounded-full flex items-center gap-1 w-fit"><RotateCcw className="w-3 h-3" /> Refunded</span>;
 return <span className="px-2 py-1 bg-muted text-muted-foreground text-[11px] font-bold rounded-full">{status}</span>;
 };

 const calculateTotal = () => {
 return orderItems.reduce((acc, item) => acc + (parseFloat(item.priceAtTime || '0') * item.quantity), 0);
 };

 return (
 <div className="flex h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] bg-background overflow-hidden">
 
 {/* Left Pane: Order List */}
 <div className={`w-full ${selectedOrder ? 'hidden md:flex md:w-[40%] lg:w-[35%]' : 'flex'} flex-col border-r border-border bg-surface shrink-0`}>
 <div className="p-1.5 md:p-1.5 border-b border-border shrink-0 bg-background z-10">
 <div className="flex items-center justify-between mb-4">
 <div>
 <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
 {isPropertyMode ? <Building2 className="w-6 h-6 text-primary" /> : <ShoppingBag className="w-6 h-6 text-primary" />}
 {isPropertyMode ? (language === 'en' ? 'Inquiries' : 'ইনকোয়ারি') : (language === 'en' ? 'Orders' : 'অর্ডারস')}
 </h1>
 <p className="text-[11px] text-muted-foreground mt-1">
 {orders.length} {isPropertyMode ? (language === 'en' ? 'inquiries total' : 'টি ইনকোয়ারি আছে') : (language === 'en' ? 'orders total' : 'টি অর্ডার আছে')}
 </p>
 </div>
 <div className="flex gap-2">
 <button onClick={() => setIsCreatingOrder(true)} className="flex items-center px-1.5 py-2 bg-primary text-primary-foreground text-[13px] font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-sm cursor-pointer">
 <Plus className="w-3.5 h-3.5 mr-1" /> New Order
 </button>
 <button onClick={fetchOrders} className="p-2 text-muted-foreground hover:text-primary transition-colors bg-muted border border-border rounded-lg cursor-pointer">
 <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
 </button>
 </div>
 </div>
 
 <div className="flex gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
 <input type="text" placeholder={language === 'en' ? 'Search orders...' : 'অর্ডার খুঁজুন...'} className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-[13px] focus:border-primary focus:outline-none text-foreground" />
 </div>
 </div>
 </div>

 <div className="flex-1 overflow-y-auto custom-scrollbar bg-muted/10 p-2 md:p-1.5 space-y-2">
 {loading ? (
 <div className="flex justify-center p-4 text-muted-foreground"><RefreshCw className="w-5 h-5 animate-spin" /></div>
 ) : orders.length === 0 ? (
 <div className="text-center p-4 text-muted-foreground">
 <ShoppingBag className="w-8 h-8 mx-auto mb-3 opacity-20" />
 <p className="text-[13px]">{language === 'en' ? 'No orders found' : 'কোনো অর্ডার নেই'}</p>
 </div>
 ) : (
 orders.map(order => (
 <div 
 key={order.id} 
 onClick={() => setSelectedOrder(order)}
 className={`p-1.5 bg-card border rounded-xl cursor-pointer hover:shadow-md transition-all ${selectedOrder?.id === order.id ? 'border-primary ring-1 ring-primary/20' : 'border-border'}`}
 >
 <div className="flex items-start justify-between mb-2">
 <div>
 <div className="font-bold text-foreground text-[13px]">{order.contact?.name || 'Unknown Contact'}</div>
 <div className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(order.createdAt), 'MMM dd, yyyy • hh:mm a')}</div>
 </div>
 {getStatusBadge(order.status)}
 </div>
 <div className="flex items-end justify-between mt-3 pt-3 border-t border-border border-dashed">
 <div className="text-[11px] text-muted-foreground">{order.items?.length || 0} items</div>
 <div className="font-bold text-primary">{order.currency || 'BDT'} {parseFloat(order.totalAmount).toLocaleString()}</div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>

 {/* Right Pane: Order Details */}
 <div className={`w-full ${!selectedOrder ? 'hidden md:flex items-center justify-center' : 'flex'} flex-col bg-background relative md:w-[60%] lg:w-[65%] h-full`}>
 {!selectedOrder ? (
 <div className="text-center text-muted-foreground flex flex-col items-center p-4">
 <div className="w-16 h-16 bg-surface border border-border rounded-full flex items-center justify-center mb-3 shadow-sm">
 <ShoppingBag className="w-8 h-8 text-muted-foreground/60" />
 </div>
 <h3 className="text-[13px] font-bold text-foreground mb-2">Select an order</h3>
 <p className="text-[13px] max-w-xs">Click on an order from the list to view its details and update status.</p>
 </div>
 ) : (
 <>
 <div className="h-16 px-1.5 md:px-1.5 border-b border-border flex items-center justify-between bg-surface shrink-0 z-10 shadow-sm">
 <div className="flex items-center gap-1.5">
 <button onClick={() => setSelectedOrder(null)} className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground transition-colors">
 <ChevronLeft className="w-5 h-5" />
 </button>
 <div>
 <h2 className="font-bold text-foreground text-[13px]">Order Details</h2>
 <div className="text-[10px] text-muted-foreground font-mono">ID: {selectedOrder.id.split('-')[0]}...</div>
 </div>
 </div>
 <select 
 value={selectedOrder.status}
 onChange={(e) => updateStatus(e.target.value)}
 disabled={statusUpdating}
 className="bg-background border border-border rounded-lg px-1.5 py-1.5 text-[13px] font-medium focus:border-primary focus:outline-none text-foreground"
 >
 <option value="pending">Pending</option>
 <option value="confirmed">Confirmed</option>
 <option value="processing">Processing</option>
 <option value="shipped">Shipped</option>
 <option value="delivered">Delivered</option>
 <option value="cancelled">Cancelled</option>
 <option value="refunded">Refunded</option>
 </select>
 </div>
 
 <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 md:p-2 bg-muted/5 ">
 <div className="max-w-3xl mx-auto space-y-3">
 
 <div className="bg-surface border border-border shadow-md rounded-2xl p-1.5">
 <div className="flex items-start justify-between">
 <div>
 <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Customer Info</h3>
 <div className="text-xl font-bold text-foreground">{selectedOrder.contact?.name || 'Unknown'}</div>
 <div className="text-[13px] text-muted-foreground mt-1">Platform: <span className="capitalize font-medium text-foreground">{selectedOrder.contact?.channel}</span></div>
 </div>
 <div className="text-right">
 {getStatusBadge(selectedOrder.status)}
 <div className="text-[11px] text-muted-foreground mt-2">Placed on {format(new Date(selectedOrder.createdAt), 'MMM dd, yyyy')}</div>
 </div>
 </div>
 </div>

 <div className="bg-surface border border-border shadow-md rounded-2xl overflow-hidden">
 <div className="p-1.5 border-b border-border bg-muted/10">
 <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider">Ordered Items</h3>
 </div>
 <div className="divide-y divide-border">
 {selectedOrder.items?.map((item: any) => (
 <div key={item.id} className="p-1.5 flex items-center gap-2 hover:bg-muted/10 transition-colors">
 <div className="w-16 h-16 bg-muted rounded-lg shrink-0 overflow-hidden border border-border">
 {item.product?.imageUrl ? <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${item.product.imageUrl}`} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-muted-foreground" /></div>}
 </div>
 <div className="flex-1">
 <div className="font-bold text-foreground">{item.product?.name || 'Unknown Product'}</div>
 {item.product?.sku && <div className="text-[11px] text-muted-foreground">SKU: {item.product.sku}</div>}
 <div className="mt-2 flex items-center justify-between">
 <div className="text-[13px] font-medium text-foreground">{selectedOrder.currency || 'BDT'} {parseFloat(item.priceAtTime).toLocaleString()} <span className="text-muted-foreground font-normal">x {item.quantity}</span></div>
 <div className="font-bold text-primary">{selectedOrder.currency || 'BDT'} {(parseFloat(item.priceAtTime) * item.quantity).toLocaleString()}</div>
 </div>
 </div>
 </div>
 ))}
 </div>
 <div className="p-1.5 md:p-1.5 bg-muted/5 border-t border-border">
 <div className="flex items-center justify-between mb-2 text-[13px] text-muted-foreground">
 <span>Subtotal</span>
 <span>{selectedOrder.currency || 'BDT'} {parseFloat(selectedOrder.totalAmount).toLocaleString()}</span>
 </div>
 <div className="flex items-center justify-between text-[13px] font-bold text-foreground mt-4 pt-4 border-t border-border border-dashed">
 <span>Total Amount</span>
 <span className="text-primary">{selectedOrder.currency || 'BDT'} {parseFloat(selectedOrder.totalAmount).toLocaleString()}</span>
 </div>
 </div>
 </div>

 {selectedOrder.notes && (
 <div className="bg-surface border border-border shadow-md rounded-2xl p-1.5">
 <h3 className="text-[13px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Order Notes</h3>
 <p className="text-[13px] text-foreground whitespace-pre-wrap">{selectedOrder.notes}</p>
 </div>
 )}
 </div>
 </div>
 </>
 )}
 </div>

 {/* Create Order Modal */}
 {isCreatingOrder && (
 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
 <div className="bg-surface border border-primary/10 shadow-xl shadow-primary/5 hover:border-primary/20 hover:shadow-primary/10 transition-all rounded-2xl w-[95vw] sm:w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
 <div className="px-1.5 py-2.5 border-b border-border flex justify-between items-center bg-background rounded-t-2xl">
 <h2 className="text-xl font-bold text-foreground flex items-center">
 <ShoppingBag className="w-5 h-5 mr-2 text-primary" /> Create New Order
 </h2>
 <button onClick={() => setIsCreatingOrder(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
 </div>
 
 <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-2 space-y-3">
 <div>
 <label className="block text-[13px] font-semibold text-foreground/80 mb-2">Customer (Lead)</label>
 <select 
 required
 value={selectedContactId}
 onChange={(e) => setSelectedContactId(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-1.5 py-2.5 text-[13px] focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
 >
 <option value="">Select a customer...</option>
 {contacts.map(c => <option key={c.id} value={c.id}>{c.name || c.externalContactId}</option>)}
 </select>
 </div>

 <div>
 <div className="flex justify-between items-center mb-2">
 <label className="block text-[13px] font-semibold text-foreground/80">Order Items</label>
 <button type="button" onClick={handleAddOrderItem} className="text-primary text-[13px] font-semibold hover:underline flex items-center">
 <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
 </button>
 </div>
 
 <div className="space-y-3 bg-muted/30 p-1.5 rounded-xl border border-border">
 {orderItems.map((item, index) => (
 <div key={index} className="flex items-center gap-1.5 bg-background p-1.5 rounded-lg border border-border shadow-sm">
 <select
 required
 value={item.productId}
 onChange={(e) => handleUpdateOrderItem(index, 'productId', e.target.value)}
 className="flex-1 bg-surface border border-border rounded-md px-1.5 py-2 text-[13px] focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
 >
 <option value="">Select Product...</option>
 {products.map(p => <option key={p.id} value={p.id}>{p.name} (BDT {p.price})</option>)}
 </select>
 
 <div className="w-24">
 <input
 type="number"
 required min="1"
 value={item.quantity}
 onChange={(e) => handleUpdateOrderItem(index, 'quantity', parseInt(e.target.value) || 1)}
 className="w-full bg-surface border border-border rounded-md px-1.5 py-2 text-[13px] focus:ring-2 focus:ring-primary focus:outline-none text-foreground"
 placeholder="Qty"
 />
 </div>
 
 <button type="button" onClick={() => handleRemoveOrderItem(index)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-md">
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 {orderItems.length === 0 && <p className="text-center text-[13px] text-muted-foreground py-2.5">No products added. Click 'Add Product'.</p>}
 </div>
 
 <div className="mt-4 text-right">
 <span className="text-[13px] font-semibold text-muted-foreground mr-4">Total Amount:</span>
 <span className="text-xl font-bold text-primary">BDT {calculateTotal().toLocaleString()}</span>
 </div>
 </div>

 <div>
 <label className="block text-[13px] font-semibold text-foreground/80 mb-2">Order Notes (Optional)</label>
 <textarea 
 value={orderNotes}
 onChange={(e) => setOrderNotes(e.target.value)}
 className="w-full bg-background border border-border rounded-lg px-1.5 py-1 text-[13px] focus:ring-2 focus:ring-primary focus:outline-none min-h-[100px] text-foreground"
 placeholder="Any special instructions or notes..."
 />
 </div>
 </form>
 
 <div className="px-1.5 py-2.5 border-t border-border bg-background rounded-b-2xl flex justify-end gap-1.5">
 <button onClick={() => setIsCreatingOrder(false)} className="px-1.5 py-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground">Cancel</button>
 <button 
 onClick={handleCreateOrder} 
 disabled={isSubmitting || orderItems.length === 0 || !selectedContactId}
 className="px-1.5 py-2 bg-primary text-primary-foreground text-[13px] font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50"
 >
 {isSubmitting ? 'Creating...' : 'Create Order'}
 </button>
 </div>
 </div>
 </div>
 )}

 </div>
 );
}
