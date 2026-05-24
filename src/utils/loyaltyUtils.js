import { base44 } from '@/api/base44Client';

/**
 * Atualiza a fidelidade do cliente SEMPRE buscando o valor mais recente do banco.
 * Isso evita sobrescrever contagens corretas com dados desatualizados do estado local.
 */
export async function updateCustomerLoyalty({ customer, orderId, settings, brasiliaTime }) {
  if (!customer?.id) return;

  // Buscar dados atualizados do cliente no banco (evita stale data do estado local)
  const freshCustomers = await base44.entities.Customer.filter({ id: customer.id });
  const freshCustomer = freshCustomers?.[0];
  if (!freshCustomer) return;

  const loyaltyTarget = settings?.loyalty_target || 10;

  if (freshCustomer.redeeming_reward || customer.redeeming_reward) {
    await base44.entities.Customer.update(freshCustomer.id, {
      loyalty_count: 0,
      has_pending_reward: false,
      reward_available_date: null
    });

    await base44.entities.LoyaltyLog.create({
      customer_id: freshCustomer.id,
      customer_phone: freshCustomer.phone,
      order_id: orderId,
      action: 'premio_resgatado',
      loyalty_count_before: freshCustomer.loyalty_count || 0,
      loyalty_count_after: 0,
      datetime_brasilia: brasiliaTime
    });
  } else {
    const currentCount = freshCustomer.loyalty_count || 0;
    const newCount = currentCount + 1;
    const hasPendingReward = newCount >= loyaltyTarget;

    await base44.entities.Customer.update(freshCustomer.id, {
      loyalty_count: hasPendingReward ? loyaltyTarget : newCount,
      has_pending_reward: hasPendingReward,
      reward_available_date: hasPendingReward ? new Date().toISOString() : freshCustomer.reward_available_date
    });

    await base44.entities.LoyaltyLog.create({
      customer_id: freshCustomer.id,
      customer_phone: freshCustomer.phone,
      order_id: orderId,
      action: hasPendingReward ? 'premio_disponivel' : 'pedido_contado',
      loyalty_count_before: currentCount,
      loyalty_count_after: newCount,
      datetime_brasilia: brasiliaTime
    });
  }
}