import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Star } from 'lucide-react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading || products.length === 0) return null;

  return (
    <section id="shop" className="py-24 bg-charcoal">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <p className="text-gold uppercase tracking-[0.3em] font-medium mb-4">Cuidados & Manutenção</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">Nossa Boutique</h2>
          <div className="w-20 h-1 bg-gold mx-auto" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product, index) => (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-clay border border-white/5 group hover:border-gold/30 transition-all flex flex-col items-center p-6 text-center"
            >
              <div className="relative w-full aspect-square mb-6 overflow-hidden bg-charcoal/50">
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gold/20">
                    <ShoppingBag className="w-16 h-16" />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-gold text-charcoal font-bold px-3 py-1 text-sm rounded shadow-lg">
                  {product.price}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-gray-500 text-sm mb-6 flex-grow">{product.description}</p>
              
              <div className="flex items-center gap-1 text-gold mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
