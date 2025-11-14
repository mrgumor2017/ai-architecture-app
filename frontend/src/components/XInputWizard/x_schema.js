export const EXPECTED_LEN = 441;


const forceReindexSchema = (schema, start = 0) => {
  let k = start;
  for (const g of schema) {
    for (const f of g.fields) {
      if (f.noX) continue;          // текст/декор не йде в X
      f.xIndex = k++;               // призначаємо унікальний індекс в порядку проходження
    }
  }
  return k; // довжина X за схемою
};
// автоіндексатор — попередньо рахувати не треба
let __auto = 0;
const idx = () => __auto++;

// допоміжна перевірка схеми (побачиш у DevTools консолі)
const validateXSchema = (schema) => {
  const used = [];
  const errors = [];

  schema.forEach(g => {
    g.fields.forEach(f => {
      if (f.noX) return; // не впливає на X
      if (!Number.isInteger(f.xIndex)) {
        errors.push(`Поле "${f.key}" у групі "${g.id}" не має валідного xIndex`);
        return;
      }
      used.push(f.xIndex);
    });
  });

  if (used.length === 0) {
    console.warn("x_schema: жодного поля з xIndex — X не збереться.");
    return;
  }

  const max = Math.max(...used);
  const set = new Set(used);

  if (set.size !== used.length) {
    console.warn("x_schema: знайдено дублікати xIndex!");
  }
  for (let i = 0; i <= max; i++) {
    if (!set.has(i)) console.warn("x_schema: пропущений індекс", i);
  }
  if (max + 1 > EXPECTED_LEN) {
    console.warn(`x_schema: фактична довжина (${max + 1}) перевищує EXPECTED_LEN=${EXPECTED_LEN}. Зайві поля не потраплять у X.`);
  }
  if (max + 1 < EXPECTED_LEN) {
    console.warn(`x_schema: фактична довжина (${max + 1}) менша за EXPECTED_LEN=${EXPECTED_LEN}. Решта індексів будуть нулями.`);
  }

  if (errors.length) {
    console.group("x_schema: помилки");
    errors.forEach(e => console.error(e));
    console.groupEnd();
  }
};


export const X_SCHEMA = [
    {
      id: "g1",
      title: "Загальні характеристики",
      fields: [
        // ── КЛАС ПРОВАЙДЕРА (взаємовиключні — тільки один може бути 1)
        { key: "prov_tier1",       label: "Клас провайдера: Tier 1",       type: "bool",  xIndex: idx(), exclusiveWith: ["prov_tier2","prov_regional"] },
        { key: "prov_tier2",       label: "Клас провайдера: Tier 2",       type: "bool",  xIndex: idx(), exclusiveWith: ["prov_tier1","prov_regional"] },
        { key: "prov_regional",    label: "Клас провайдера: регіональний", type: "bool",  xIndex: idx(), exclusiveWith: ["prov_tier1","prov_tier2"] },

        // ── КІЛЬКІСТЬ СЕРВІСІВ
        { key: "services_count",   label: "Кількість користувальницьких сервісів провайдера", type: "int", min: 1, max: 100, xIndex: idx() },

        // ── КІЛЬКІСТЬ КЛІЄНТІВ ЗА СТАТУСОМ
        { key: "clients_active",        label: "Кількість клієнтів: активний",     type: "int", min: 1, max: 1_000_000, xIndex: idx() },
        { key: "clients_blocked",       label: "Кількість клієнтів: заблокований", type: "int", min: 1, max: 100_000,   xIndex: idx() },
        { key: "clients_disconnected",  label: "Кількість клієнтів: відключений",  type: "int", min: 1, max: 10_000,    xIndex: idx() },

        // ── КЛАСИ КЛІЄНТІВ (можуть бути кілька одночасно)
        { key: "cust_home",        label: "Класи клієнтів: домашні користувачі",  type: "bool", xIndex: idx() },
        { key: "cust_corporate",   label: "Класи клієнтів: корпоративні клієнти", type: "bool", xIndex: idx() },
        { key: "cust_operators",   label: "Класи клієнтів: оператори зв'язку",    type: "bool", xIndex: idx() },

        // ── ТИПИ ЦИФРОВИХ ПРОДУКТІВ
        { key: "prod_mobile_4g5g",   label: "Типи продуктів: мобільний зв'язок 4G/5G",           type: "bool", xIndex: idx() },
        { key: "prod_internet_adsl", label: "Типи продуктів: фіксований інтернет (ADSL)",        type: "bool", xIndex: idx() },
        { key: "prod_internet_fiber",label: "Типи продуктів: фіксований інтернет (оптоволокно)", type: "bool", xIndex: idx() },
        { key: "prod_voip",          label: "Типи продуктів: IP-телефонія",                      type: "bool", xIndex: idx() },
        { key: "prod_iptv",          label: "Типи продуктів: IPTV",                              type: "bool", xIndex: idx() },
        { key: "prod_cloud_services",label: "Типи продуктів: хмарні сервіси",                    type: "bool", xIndex: idx() },
        { key: "prod_cybersec",      label: "Типи продуктів: кібербезпека",                      type: "bool", xIndex: idx() },
        { key: "prod_tv",            label: "Типи продуктів: телебачення",                       type: "bool", xIndex: idx() },
        { key: "prod_cloud_storage", label: "Типи продуктів: хмарні сховища",                    type: "bool", xIndex: idx() },
        { key: "prod_hosting",       label: "Типи продуктів: хостинг",                           type: "bool", xIndex: idx() },
        { key: "prod_iot",           label: "Типи продуктів: IoT",                               type: "bool", xIndex: idx() },

        // ── ДОДАТКОВІ СЕРВІСИ (VAS)
        { key: "vas_mobile_apps",    label: "VAS: мобільні додатки",           type: "bool", xIndex: idx() },
        { key: "vas_cloud_storage",  label: "VAS: хмарне сховище",             type: "bool", xIndex: idx() },
        { key: "vas_netflix",        label: "VAS: Netflix",                    type: "bool", xIndex: idx() },
        { key: "vas_megogo",         label: "VAS: Megogo",                     type: "bool", xIndex: idx() },
        { key: "vas_home_security",  label: "VAS: Home Security",              type: "bool", xIndex: idx() },

        // ── ОДНОЧАСНІ КОРИСТУВАЧІ
        { key: "concurrent_max",     label: "Кількість одночасно під’єднаних користувачів: максимальне", type: "int", min: 1, max: 1_000, xIndex: idx() },
        { key: "concurrent_avg",     label: "Кількість одночасно під’єднаних користувачів: середнє",    type: "int", min: 1, max: 1_000, xIndex: idx() },

        // ── ГЕОГРАФІЧНЕ ПОКРИТТЯ (може бути кілька рівнів)
        { key: "geo_large_country",  label: "Географічне покриття: велика країна", type: "bool", xIndex: idx() },
        { key: "geo_country",        label: "Географічне покриття: країна",       type: "bool", xIndex: idx() },
        { key: "geo_region",         label: "Географічне покриття: регіон",       type: "bool", xIndex: idx() },
        { key: "geo_cities",         label: "Географічне покриття: міста",        type: "bool", xIndex: idx() },

        // ── РЕГУЛЯТОРНА ВІДПОВІДНІСТЬ / ПОЛІТИКИ
        { key: "reg_gdpr",           label: "Регуляторні вимоги: GDPR",           type: "bool", xIndex: idx() },
        { key: "reg_reporting_std",  label: "Регуляторна відповідність: звітність (стандарт)",   type: "bool", xIndex: idx() },
        { key: "reg_encryption_std", label: "Регуляторна відповідність: шифрування даних (стандарт)", type: "bool", xIndex: idx() },
        { key: "reg_pricing_rules",  label: "Регуляторна відповідність: правила формування цін (стандарт)", type: "bool", xIndex: idx() },

        // ── МОДЕЛЬ БІЗНЕСУ (може бути кілька каналів продажу)
        { key: "biz_direct_sales",   label: "Модель бізнесу: прямі продажі",     type: "bool", xIndex: idx() },
        { key: "biz_distributors",   label: "Модель бізнесу: дистриб'ютори",     type: "bool", xIndex: idx() },
        { key: "biz_partners",       label: "Модель бізнесу: партнерські програми", type: "bool", xIndex: idx() },

        // ── ЦІЛЬОВА АУДИТОРІЯ
        { key: "aud_home",           label: "Цільова аудиторія: домашні користувачі", type: "bool", xIndex: idx() },
        { key: "aud_business",       label: "Цільова аудиторія: бізнес",             type: "bool", xIndex: idx() },
        { key: "aud_gov",            label: "Цільова аудиторія: державні установи",  type: "bool", xIndex: idx() },

        // ── КАНАЛИ ПРОДАЖІВ
        { key: "ch_own_stores",      label: "Канали продажів: власні магазини",  type: "bool", xIndex: idx() },
        { key: "ch_portals",         label: "Канали продажів: портали",          type: "bool", xIndex: idx() },
        { key: "ch_mobile_apps",     label: "Канали продажів: мобільні застосунки", type: "bool", xIndex: idx() },
        { key: "ch_online",          label: "Канали продажів: онлайн-продажі",   type: "bool", xIndex: idx() },
        { key: "ch_dealers",         label: "Канали продажів: дилери",           type: "bool", xIndex: idx() },
      ],
    },

  {
  id: "g2",
  title: "Функціональні вимоги / компоненти",
  fields: [
    // ────────────────────────── PIM ──────────────────────────
    { key: "comp_pim", label: "Каталог цифрових продуктів (PIM)", type: "bool", xIndex: idx() },

    // Функції PIM: Mobile Pre-paid (перелік можливостей тарифів)
    { key: "pim_prepaid_included_minutes_texts", label: "PIM: Pre-paid — Included minutes/texts", type: "bool", xIndex: idx() },
    { key: "pim_prepaid_data_allowances",        label: "PIM: Pre-paid — Data allowances",       type: "bool", xIndex: idx() },
    { key: "pim_prepaid_international_calling",  label: "PIM: Pre-paid — International calling", type: "bool", xIndex: idx() },
    { key: "pim_prepaid_data_speeds",            label: "PIM: Pre-paid — Data speeds",           type: "bool", xIndex: idx() },
    { key: "pim_prepaid_rollover_data",          label: "PIM: Pre-paid — Rollover data",         type: "bool", xIndex: idx() },
    { key: "pim_prepaid_auto_renewal",           label: "PIM: Pre-paid — Auto-renewal",          type: "bool", xIndex: idx() },
    { key: "pim_prepaid_international_roaming",  label: "PIM: Pre-paid — International roaming", type: "bool", xIndex: idx() },

    // Перелік мобільних передоплачених тарифів
    { key: "pim_prepaid_plan_basic_talk_text",   label: "PIM: Pre-paid план — Basic Talk & Text",      type: "bool", xIndex: idx() },
    { key: "pim_prepaid_plan_data_focused",      label: "PIM: Pre-paid план — Data-Focused Plan",      type: "bool", xIndex: idx() },
    { key: "pim_prepaid_plan_intl_calling",      label: "PIM: Pre-paid план — International Calling",  type: "bool", xIndex: idx() },
    { key: "pim_prepaid_plan_travel",            label: "PIM: Pre-paid план — Travel Plan",            type: "bool", xIndex: idx() },

    // Функції PIM: Mobile Post-paid
    { key: "pim_postpaid_unlimited_minutes_texts_data_allowances", label: "PIM: Post-paid — Unlimited minutes/texts & data allowances", type: "bool", xIndex: idx() },
    { key: "pim_postpaid_unlimited_data_options",                  label: "PIM: Post-paid — Unlimited data options",                    type: "bool", xIndex: idx() },
    { key: "pim_postpaid_international_roaming",                   label: "PIM: Post-paid — International roaming",                    type: "bool", xIndex: idx() },
    { key: "pim_postpaid_multiple_lines_discount",                 label: "PIM: Post-paid — Multiple lines (знижки)",                  type: "bool", xIndex: idx() },
    { key: "pim_postpaid_device_financing",                        label: "PIM: Post-paid — Device financing",                         type: "bool", xIndex: idx() },
    { key: "pim_postpaid_premium_features_streaming",              label: "PIM: Post-paid Premium — streaming",                        type: "bool", xIndex: idx() },
    { key: "pim_postpaid_premium_features_cloud_storage",          label: "PIM: Post-paid Premium — cloud storage",                    type: "bool", xIndex: idx() },
    { key: "pim_postpaid_premium_features_priority_support",       label: "PIM: Post-paid Premium — priority support",                 type: "bool", xIndex: idx() },
    { key: "pim_postpaid_data_prioritization",                     label: "PIM: Post-paid — Data prioritization",                      type: "bool", xIndex: idx() },
    { key: "pim_postpaid_flexible_billing",                        label: "PIM: Post-paid — Flexible billing",                         type: "bool", xIndex: idx() },
    { key: "pim_postpaid_mobile_hotspots",                         label: "PIM: Post-paid — Mobile hotspots",                          type: "bool", xIndex: idx() },
    { key: "pim_postpaid_travel_passes",                           label: "PIM: Post-paid — Travel passes",                            type: "bool", xIndex: idx() },
    { key: "pim_postpaid_device_upgrades",                         label: "PIM: Post-paid — Device upgrades",                          type: "bool", xIndex: idx() },
    { key: "pim_postpaid_family_safety_features",                  label: "PIM: Post-paid — Family safety features",                   type: "bool", xIndex: idx() },
    { key: "pim_postpaid_unlimited_talk",                          label: "PIM: Post-paid — Unlimited talk",                           type: "bool", xIndex: idx() },
    { key: "pim_postpaid_unlimited_text",                          label: "PIM: Post-paid — Unlimited text",                           type: "bool", xIndex: idx() },
    { key: "pim_postpaid_high_speed_data",                         label: "PIM: Post-paid — High-speed data",                          type: "bool", xIndex: idx() },
    { key: "pim_postpaid_priority_customer_support",               label: "PIM: Post-paid — Priority customer support",                type: "bool", xIndex: idx() },
    { key: "pim_postpaid_concierge_services",                      label: "PIM: Post-paid — Concierge services",                       type: "bool", xIndex: idx() },
    { key: "pim_postpaid_access_exclusive_events",                 label: "PIM: Post-paid — Access to exclusive events",               type: "bool", xIndex: idx() },

    // Перелік мобільних постоплачених тарифів
    { key: "pim_postpaid_plan_unlimited_everything", label: "PIM: Post-paid план — Unlimited Everything", type: "bool", xIndex: idx() },
    { key: "pim_postpaid_plan_family",               label: "PIM: Post-paid план — Family Plan",          type: "bool", xIndex: idx() },
    { key: "pim_postpaid_plan_premium",              label: "PIM: Post-paid план — Premium Plan",         type: "bool", xIndex: idx() },

    // ────────────────────────── CPQ ──────────────────────────
    { key: "comp_cpq", label: "Компонент квотації (CPQ)", type: "bool", xIndex: idx() },

    // CPQ — інтеграції (TMF)
    { key: "cpq_int_tmf622_product_order_mgmt",  label: "CPQ інтеграція: TMF 622 Product Order Management",   type: "bool", xIndex: idx() },
    { key: "cpq_int_tmf648_quote_mgmt",          label: "CPQ інтеграція: TMF 648 Quote Management",            type: "bool", xIndex: idx() },
    { key: "cpq_int_tmf663_shopping_cart",       label: "CPQ інтеграція: TMF 663 Shopping Cart Management",    type: "bool", xIndex: idx() },
    { key: "cpq_int_tmf620_product_catalog",     label: "CPQ інтеграція: TMF 620 Product Catalog Management",  type: "bool", xIndex: idx() },

    // CPQ — підключення функцій категорій
    // Mobile Pre-paid
    { key: "cpq_prepaid_included_minutes_sms",   label: "CPQ Pre-paid: включені хвилини/SMS",     type: "bool", xIndex: idx() },
    { key: "cpq_prepaid_data_limits",            label: "CPQ Pre-paid: ліміти мобільного інтернету", type: "bool", xIndex: idx() },
    { key: "cpq_prepaid_international_calls",    label: "CPQ Pre-paid: міжнародні дзвінки",       type: "bool", xIndex: idx() },
    { key: "cpq_prepaid_auto_renewal",           label: "CPQ Pre-paid: автопродовження тарифу",   type: "bool", xIndex: idx() },
    { key: "cpq_prepaid_overage_charging",       label: "CPQ Pre-paid: тарифікація понад ліміт",  type: "bool", xIndex: idx() },

    // Mobile Post-paid
    { key: "cpq_postpaid_unlimited_calls_sms",   label: "CPQ Post-paid: необмежені дзвінки/SMS",  type: "bool", xIndex: idx() },
    { key: "cpq_postpaid_traffic_priority",      label: "CPQ Post-paid: пріоритет трафіку",       type: "bool", xIndex: idx() },
    { key: "cpq_postpaid_hotspot",               label: "CPQ Post-paid: роздача інтернету",       type: "bool", xIndex: idx() },
    { key: "cpq_postpaid_shared_plans",          label: "CPQ Post-paid: спільні плани",           type: "bool", xIndex: idx() },
    { key: "cpq_postpaid_vas",                   label: "CPQ Post-paid: додаткові сервіси (VAS)", type: "bool", xIndex: idx() },

    // Home Internet
    { key: "cpq_home_internet_speed",            label: "CPQ Home Internet: швидкість з'єднання", type: "bool", xIndex: idx() },
    { key: "cpq_home_internet_traffic_limit",    label: "CPQ Home Internet: ліміти трафіку",      type: "bool", xIndex: idx() },
    { key: "cpq_home_internet_wifi_router",      label: "CPQ Home Internet: Wi-Fi роутер",        type: "bool", xIndex: idx() },
    { key: "cpq_home_internet_static_ip",        label: "CPQ Home Internet: виділена IP-адреса",  type: "bool", xIndex: idx() },

    // Business Internet
    { key: "cpq_biz_internet_sla",               label: "CPQ Business Internet: гарантія сервісу (SLA)", type: "bool", xIndex: idx() },
    { key: "cpq_biz_internet_support",           label: "CPQ Business Internet: технічна підтримка",      type: "bool", xIndex: idx() },

    // IPTV
    { key: "cpq_iptv_channels_count",            label: "CPQ IPTV: кількість каналів",            type: "bool", xIndex: idx() },
    { key: "cpq_iptv_quality",                   label: "CPQ IPTV: якість зображення",            type: "bool", xIndex: idx() },
    { key: "cpq_iptv_additional_features",       label: "CPQ IPTV: додаткові функції",            type: "bool", xIndex: idx() },

    // Additional Services
    { key: "cpq_add_subscriptions_netflix",      label: "CPQ Additional: підписка Netflix",       type: "bool", xIndex: idx() },
    { key: "cpq_add_subscriptions_megogo",       label: "CPQ Additional: підписка Megogo",        type: "bool", xIndex: idx() },
    { key: "cpq_add_packages_sport",             label: "CPQ Additional: пакет каналів Спорт",     type: "bool", xIndex: idx() },
    { key: "cpq_add_packages_cinema",            label: "CPQ Additional: пакет каналів Кіно",      type: "bool", xIndex: idx() },
    { key: "cpq_add_packages_kids",              label: "CPQ Additional: пакет каналів Дитячі",    type: "bool", xIndex: idx() },

    // CPQ Flow Scenarios
    { key: "cpq_flow_new_client_prepaid",        label: "CPQ Flow: Новий клієнт (Pre-paid)",       type: "bool", xIndex: idx() },
    { key: "cpq_flow_new_client_postpaid",       label: "CPQ Flow: Новий клієнт (Post-paid)",      type: "bool", xIndex: idx() },
    { key: "cpq_flow_tariff_change",             label: "CPQ Flow: Зміна тарифу",                  type: "bool", xIndex: idx() },
    { key: "cpq_flow_add_vas",                   label: "CPQ Flow: Додавання VAS сервісів",        type: "bool", xIndex: idx() },
    { key: "cpq_flow_connect_iptv_to_inet",      label: "CPQ Flow: Підключення IPTV до існуючого інтернету", type: "bool", xIndex: idx() },
    { key: "cpq_flow_b2b_inet_sla",              label: "CPQ Flow: B2B клієнт — Інтернет + SLA",   type: "bool", xIndex: idx() },

    // ────────────────────────── Customer Order Management ──────────────────────────
    { key: "comp_com", label: "Компонент Customer Order Management", type: "bool", xIndex: idx() },
    { key: "com_standard_entities",             label: "COM: стандартні сутності (замовлення/клієнт/послуга/провіж./білінг/оплата/тариф/налаштування)", type: "bool", xIndex: idx() },
    { key: "com_geo_redundant_deployment",      label: "COM: Geo-Redundant Deployment",            type: "bool", xIndex: idx() },
    { key: "com_edge_computing_allocation",     label: "COM: Edge Computing Allocation",           type: "bool", xIndex: idx() },
    { key: "com_data_privacy_compliance",       label: "COM: Data Privacy Compliance",             type: "bool", xIndex: idx() },

    // ────────────────────────── BSS Order Management ──────────────────────────
    { key: "comp_bss_order_mgmt", label: "Компонент BSS Order Management", type: "bool", xIndex: idx() },

    // BSS OM — інтеграції
    { key: "bss_om_int_tmf622_product_order",   label: "BSS OM інтеграція: TMF 622 Product Order Management", type: "bool", xIndex: idx() },
    { key: "bss_om_int_tmf641_service_order",   label: "BSS OM інтеграція: TMF 641 Service Order Management", type: "bool", xIndex: idx() },

    // BSS OM — типи ордерів / параметри
    { key: "bss_om_b2c_mobile_prepaid",         label: "BSS OM: B2C Mobile — prepaid",  type: "bool", xIndex: idx() },
    { key: "bss_om_b2c_mobile_postpaid",        label: "BSS OM: B2C Mobile — postpaid", type: "bool", xIndex: idx() },
    { key: "bss_om_fixed",                      label: "BSS OM: Fixed",                  type: "bool", xIndex: idx() },
    { key: "bss_om_b2b_l2_l3_vpn",              label: "BSS OM: B2B L2/L3 VPNs",        type: "bool", xIndex: idx() },

    // Методи оплати
    { key: "bss_om_pay_card",                   label: "BSS OM оплата: карта",          type: "bool", xIndex: idx() },
    { key: "bss_om_pay_debit",                  label: "BSS OM оплата: дебіт",          type: "bool", xIndex: idx() },
    { key: "bss_om_pay_credit",                 label: "BSS OM оплата: кредит",         type: "bool", xIndex: idx() },
    { key: "bss_om_pay_auto_charge",            label: "BSS OM оплата: автосписання",   type: "bool", xIndex: idx() },

    // Налаштування послуги
    { key: "bss_om_cfg_inet_speed",             label: "BSS OM налаштування: швидкість інтернету", type: "bool", xIndex: idx() },
    { key: "bss_om_cfg_inet_quota",             label: "BSS OM налаштування: обсяг трафіку",       type: "bool", xIndex: idx() },
    { key: "bss_om_cfg_priority_access",        label: "BSS OM налаштування: пріоритетний доступ", type: "bool", xIndex: idx() },

    // Рівні QoS
    { key: "bss_om_qos_priority",               label: "BSS OM QoS: пріоритетний трафік", type: "bool", xIndex: idx() },
    { key: "bss_om_qos_standard",               label: "BSS OM QoS: стандартний",        type: "bool", xIndex: idx() },
    { key: "bss_om_qos_economy",                label: "BSS OM QoS: економ",             type: "bool", xIndex: idx() },

    // Рівень SLA (доступність)
    { key: "bss_om_sla_defined",                label: "BSS OM: визначений рівень SLA (доступність)", type: "bool", xIndex: idx() },

    // ────────────────────────── Customer Information Management ──────────────────────────
    { key: "comp_cim", label: "Компонент Customer Information Management", type: "bool", xIndex: idx() },
    { key: "cim_crm_integration",              label: "CIM: Інтеграція з CRM для обробки запитів",                  type: "bool", xIndex: idx() },
    { key: "cim_consents_mgmt",                label: "CIM: Управління згодами на обробку персональних даних",      type: "bool", xIndex: idx() },
    { key: "cim_credit_for_services",          label: "CIM: Можливість отримання кредиту (відстрочка платежу)",     type: "bool", xIndex: idx() },
    { key: "cim_risk_scoring",                 label: "CIM: Оцінка ризику клієнта",                                  type: "bool", xIndex: idx() },
    { key: "cim_accounts_linking",             label: "CIM: Зв’язок з іншими акаунтами",                            type: "bool", xIndex: idx() },
    { key: "cim_auth_password",                label: "CIM: Рівень аутентифікації — пароль",                        type: "bool", xIndex: idx() },
    { key: "cim_auth_2fa",                     label: "CIM: Рівень аутентифікації — 2FA",                           type: "bool", xIndex: idx() },
    { key: "cim_auth_biometry",                label: "CIM: Рівень аутентифікації — біометрія",                      type: "bool", xIndex: idx() },

    // ────────────────────────── Інші компоненти-заглушки (вмикаються як є) ──────────────────────────
    { key: "comp_product_digital_sales",        label: "Компонент Product Digital Sales",                 type: "bool", xIndex: idx() },
    { key: "comp_bss_pmwp_utm",                 label: "Компонент BSS PMWP/UTM",                          type: "bool", xIndex: idx() },

    // ────────────────────────── Order Management Provisioning Flow ──────────────────────────
    { key: "comp_om_provisioning_flow",         label: "Компонент Order Management Provisioning Flow",    type: "bool", xIndex: idx() },

    // Provisioning Flow — Mobile Postpaid
    { key: "om_postpaid_number_availability",   label: "OM Flow (Postpaid): Перевірка доступності номера",   type: "bool", xIndex: idx() },
    { key: "om_postpaid_billing_account_create",label: "OM Flow (Postpaid): Створення білінгового акаунта",  type: "bool", xIndex: idx() },
    { key: "om_postpaid_sim_activation",        label: "OM Flow (Postpaid): Активація SIM-карти",            type: "bool", xIndex: idx() },
    { key: "om_postpaid_tariff_change_rules",   label: "OM Flow (Postpaid): Перевірка умов зміни тарифу",    type: "bool", xIndex: idx() },
    { key: "om_postpaid_billing_update",        label: "OM Flow (Postpaid): Оновлення білінгових даних",     type: "bool", xIndex: idx() },
    { key: "om_postpaid_profile_update",        label: "OM Flow (Postpaid): Оновлення профілю абонента",     type: "bool", xIndex: idx() },
    { key: "om_postpaid_deactivation_request",  label: "OM Flow (Postpaid): Запит на деактивацію",            type: "bool", xIndex: idx() },
    { key: "om_postpaid_billing_stop",          label: "OM Flow (Postpaid): Припинення білінгу",             type: "bool", xIndex: idx() },
    { key: "om_postpaid_network_disconnect",    label: "OM Flow (Postpaid): Відключення від мережі",          type: "bool", xIndex: idx() },

    // Provisioning Flow — Mobile Prepaid
    { key: "om_prepaid_sim_compatibility_check",label: "OM Flow (Prepaid): Перевірка сумісності SIM",        type: "bool", xIndex: idx() },
    { key: "om_prepaid_initial_balance_activation", label: "OM Flow (Prepaid): Активація початкового балансу", type: "bool", xIndex: idx() },
    { key: "om_prepaid_tariff_change_rules",    label: "OM Flow (Prepaid): Перевірка умов зміни тарифу",     type: "bool", xIndex: idx() },
    { key: "om_prepaid_tariffs_available_check",label: "OM Flow (Prepaid): Перевірка доступних тарифів",     type: "bool", xIndex: idx() },
    { key: "om_prepaid_tariff_update",          label: "OM Flow (Prepaid): Оновлення тарифного плану",       type: "bool", xIndex: idx() },
    { key: "om_prepaid_block_number_request",   label: "OM Flow (Prepaid): Запит на блокування номера",      type: "bool", xIndex: idx() },

    // Provisioning Flow — Home Internet
    { key: "om_home_inet_account_deactivation", label: "OM Flow (Home Internet): Деактивація облікового запису", type: "bool", xIndex: idx() },
    { key: "om_home_inet_tech_availability",    label: "OM Flow (Home Internet): Перевірка технічної доступності", type: "bool", xIndex: idx() },
    { key: "om_home_inet_billing_registration", label: "OM Flow (Home Internet): Реєстрація в білінгу",       type: "bool", xIndex: idx() },
    { key: "om_home_inet_equipment_setup",      label: "OM Flow (Home Internet): Налаштування обладнання",   type: "bool", xIndex: idx() },
    { key: "om_home_inet_speed_change_possible",label: "OM Flow (Home Internet): Перевірка можливості зміни швидкості", type: "bool", xIndex: idx() },
    { key: "om_home_inet_billing_params_update",label: "OM Flow (Home Internet): Оновлення білінгових параметрів", type: "bool", xIndex: idx() },

    // Provisioning Flow — IPTV
    { key: "om_iptv_disconnect_request",        label: "OM Flow (IPTV): Запит на відключення",       type: "bool", xIndex: idx() },
    { key: "om_iptv_physical_disconnect",       label: "OM Flow (IPTV): Фізичне відключення",        type: "bool", xIndex: idx() },
    { key: "om_iptv_channels_availability",     label: "OM Flow (IPTV): Перевірка доступності каналів", type: "bool", xIndex: idx() },
    { key: "om_iptv_package_activation",        label: "OM Flow (IPTV): Активація пакету",           type: "bool", xIndex: idx() },
    { key: "om_iptv_new_package_check",         label: "OM Flow (IPTV): Перевірка нового пакету",    type: "bool", xIndex: idx() },
    { key: "om_iptv_access_update",             label: "OM Flow (IPTV): Оновлення доступу до каналів", type: "bool", xIndex: idx() },

    // ────────────────────────── Corrected Order Volume Model ──────────────────────────
    { key: "comp_corrected_ovm", label: "Компонент Corrected Order Volume Model", type: "bool", xIndex: idx() },

    // COVM — сценарії
    { key: "covm_mobile_postpaid_new",          label: "COVM Mobile Postpaid: Нове замовлення", type: "bool", xIndex: idx() },
    { key: "covm_mobile_postpaid_change",       label: "COVM Mobile Postpaid: Зміна тарифу",    type: "bool", xIndex: idx() },
    { key: "covm_mobile_postpaid_deactivation", label: "COVM Mobile Postpaid: Деактивація",     type: "bool", xIndex: idx() },
    { key: "covm_mobile_prepaid_new",           label: "COVM Mobile Prepaid: Нове замовлення",  type: "bool", xIndex: idx() },
    { key: "covm_mobile_prepaid_change",        label: "COVM Mobile Prepaid: Зміна тарифу",     type: "bool", xIndex: idx() },
    { key: "covm_mobile_prepaid_deactivation",  label: "COVM Mobile Prepaid: Деактивація",      type: "bool", xIndex: idx() },
    { key: "covm_home_inet_gpon_new",           label: "COVM Home Internet (GPON): Нове замовлення", type: "bool", xIndex: idx() },
    { key: "covm_home_inet_gpon_change",        label: "COVM Home Internet (GPON): Зміна тарифу",    type: "bool", xIndex: idx() },
    { key: "covm_home_inet_gpon_deactivation",  label: "COVM Home Internet (GPON): Деактивація",     type: "bool", xIndex: idx() },
    { key: "covm_iptv_new",                     label: "COVM IPTV: Нове замовлення",                 type: "bool", xIndex: idx() },
    { key: "covm_iptv_change",                  label: "COVM IPTV: Зміна тарифу",                    type: "bool", xIndex: idx() },
    { key: "covm_iptv_deactivation",            label: "COVM IPTV: Деактивація",                     type: "bool", xIndex: idx() },

    // ────────────────────────── Інші BSS/OSS/CSRD компоненти ──────────────────────────
    { key: "comp_bss_b2b_oc_ui",                label: "Компонент BSS B2B OC UI",              type: "bool", xIndex: idx() },
    { key: "comp_bss_b2b_portal",               label: "Компонент BSS B2B Portal",             type: "bool", xIndex: idx() },
    { key: "comp_bss_pnl_cost_mgmt",            label: "Компонент BSS PnL and Cost Management", type: "bool", xIndex: idx() },
    { key: "comp_bss_cloud_order_mgmt_toe",     label: "Компонент BSS Cloud Order Management TOE", type: "bool", xIndex: idx() },
    { key: "comp_bss_desktop",                  label: "Компонент BSS Desktop",                 type: "bool", xIndex: idx() },
    { key: "comp_oss_iptv",                     label: "Компонент OSS IPTV",                    type: "bool", xIndex: idx() },
    { key: "comp_oss_voip",                     label: "Компонент OSS VoIP",                    type: "bool", xIndex: idx() },

    // OSS білінг (тип)
    { key: "comp_oss_billing",                  label: "Компонент OSS білінгу",                 type: "bool", xIndex: idx() },
    { key: "oss_billing_type_prepaid",          label: "OSS Білінг: тип — Prepaid",             type: "bool", xIndex: idx() },
    { key: "oss_billing_type_postpaid",         label: "OSS Білінг: тип — Postpaid",            type: "bool", xIndex: idx() },

    // CSRD
    { key: "comp_csrd",                         label: "Компонент CSRD",                        type: "bool", xIndex: idx() },
    { key: "csrd_tickets_management",           label: "CSRD: управління заявками/тікетами",    type: "bool", xIndex: idx() },
    { key: "csrd_orders_editing",               label: "CSRD: оформлення/редагування замовлень", type: "bool", xIndex: idx() },
    { key: "csrd_billing_data_access",          label: "CSRD: доступ до білінгових даних",      type: "bool", xIndex: idx() },
    { key: "csrd_services_activation",          label: "CSRD: активації/деактивації послуг",    type: "bool", xIndex: idx() },
    { key: "csrd_customer_history",             label: "CSRD: історія взаємодії з клієнтом",    type: "bool", xIndex: idx() },
    { key: "csrd_knowledge_base",               label: "CSRD: база знань/стандартні відповіді", type: "bool", xIndex: idx() },
    { key: "csrd_fraud_detection",              label: "CSRD: виявлення шахрайських операцій",  type: "bool", xIndex: idx() },
    { key: "csrd_segment_filtering",            label: "CSRD: фільтрований перегляд за сегментами", type: "bool", xIndex: idx() },
    { key: "csrd_performance_dashboard",        label: "CSRD: панель моніторингу продуктивності", type: "bool", xIndex: idx() },
    { key: "csrd_gdpr_compliance_module",       label: "CSRD: модуль GDPR відповідності",       type: "bool", xIndex: idx() },
    { key: "csrd_calls_recording_analysis",     label: "CSRD: запис та аналіз дзвінків",        type: "bool", xIndex: idx() },
    { key: "csrd_live_chat_integration",        label: "CSRD: інтеграція з live-чатом",         type: "bool", xIndex: idx() },
    { key: "csrd_escalation_system",            label: "CSRD: ескалація звернень",              type: "bool", xIndex: idx() },
    { key: "csrd_automation_common_requests",   label: "CSRD: автоматизація типових запитів",   type: "bool", xIndex: idx() },
    { key: "csrd_sla_control",                  label: "CSRD: контроль виконання SLA",          type: "bool", xIndex: idx() },
  ],
},

  {
  id: "g3",
  title: "Нефункціональні вимоги до сервісів (per-service)",
  fields: [
    // ── МЕТА (не в X)
    { key: "svc_name", label: "Назва сервісу", type: "text", noX: true },

    // ── РІВЕНЬ QoS (one-hot: може бути кілька, якщо треба; або зробимо взаємовиключними)
    { key: "qos_priority",   label: "QoS: Пріоритетний трафік", type: "bool", xIndex: idx() },
    { key: "qos_standard",   label: "QoS: Стандартний",         type: "bool", xIndex: idx() },
    { key: "qos_economy",    label: "QoS: Економ",              type: "bool", xIndex: idx() },

    // ── ПРОДУКТИВНІСТЬ (ознака)
    { key: "performance_flag", label: "Продуктивність (performance) — увімкнено", type: "bool", xIndex: idx() },

    // ── КІЛЬКІСНІ ПОКАЗНИКИ ПРОДУКТИВНОСТІ
    { key: "perf_response_time_s", label: "Час реакції системи, с", type: "int",  min: 1, max: 10,       xIndex: idx() },
    { key: "perf_concurrent_users",label: "Одночасно працюючі користувачі", type: "int",  min: 1, max: 1_000_000, xIndex: idx() },

    // ── МОДИФІКОВУВАНІСТЬ (ознака)
    { key: "modifiability_flag", label: "Модифікувальність — увімкнено", type: "bool", xIndex: idx() },
    // (Кількісні показники модифікувальності — уточнимо пізніше, якщо будуть)

    // ── БЕЗПЕКА
    { key: "security_flag",                 label: "Безпека — увімкнено",         type: "bool", xIndex: idx() },
    { key: "security_total_encryption",     label: "Безпека: тотальне шифрування", type: "bool", xIndex: idx() },
    { key: "security_encryption_standard",  label: "Стандарт тотального шифрування (назва)", type: "text", noX: true },
    { key: "security_otp_auth",             label: "Одноразова аутентифікація (OTP)",         type: "bool", xIndex: idx() },

    // ── НАДІЙНІСТЬ
    { key: "reliability_flag",  label: "Надійність — увімкнено", type: "bool", xIndex: idx() },
    { key: "reliability_percent", label: "Показник рівня надійності мережі/сервісу, % (до 99.99)", type: "percent", xIndex: idx() },

    // ── ДОСТУПНІСТЬ
    { key: "availability_flag",           label: "Доступність — увімкнено", type: "bool", xIndex: idx() },
    { key: "availability_percent",        label: "Відсоток доступності сервісу, % (до 99.99)", type: "percent", xIndex: idx() },
    { key: "availability_time_ranges",    label: "Періоди доступності (діапазони часу)", type: "text", noX: true },

    // ── ПРИДАТНІСТЬ/ЮЗАБІЛІТІ
    { key: "usability_flag",      label: "Придатність (usability) — увімкнено",    type: "bool", xIndex: idx() },
    // { key: "...", label: "Кількісні показники придатності", ... } // уточнимо за потреби

    // ── ТЕСТУВАЛЬНІСТЬ
    { key: "testability_flag",    label: "Тестувальність — увімкнено",  type: "bool", xIndex: idx() },
    // { key: "...", label: "Кількісні показники тестувальності", ... }

    // ── ЛЕГКІСТЬ ПІДТРИМКИ
    { key: "maintainability_flag", label: "Легкість підтримки — увімкнено", type: "bool", xIndex: idx() },
    // { key: "...", label: "Кількісні показники легкості підтримки", ... }

    // ── КРИТИЧНІСТЬ
    { key: "criticality_flag",    label: "Критичність — увімкнено", type: "bool", xIndex: idx() },
    // { key: "...", label: "Кількісні показники критичності", ... }
  ],
},

  {
  id: "g4",
  title: "Кількісні характеристики сервісів та клієнтів",
  fields: [
    // К-сть клієнтів кожного сервісу провайдера (1..10^7)
    { key: "cnt_clients_pim",                 label: "Клієнти сервісу: PIM",                                  type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_cpq",                 label: "Клієнти сервісу: Компонент квотації CPQ",               type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_order_mgmt",          label: "Клієнти сервісу: Компонент Order Management",           type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_cim",                 label: "Клієнти сервісу: Customer Information Management",      type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_digital_sales",       label: "Клієнти сервісу: Product Digital Sales",                type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_pmwp_utm",            label: "Клієнти сервісу: BSS PMWP/UTM",                         type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_bss_pim",             label: "Клієнти сервісу: BSS PIM",                              type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_b2b_oc_ui",           label: "Клієнти сервісу: BSS B2B OC UI",                        type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_b2b_portal",          label: "Клієнти сервісу: BSS B2B Portal",                       type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_pnl_cost",            label: "Клієнти сервісу: BSS PnL and Cost Management",          type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_cloud_order_toe",     label: "Клієнти сервісу: BSS Cloud Order Management TOE",       type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_bss_desktop",         label: "Клієнти сервісу: BSS Desktop",                          type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_oss_iptv",            label: "Клієнти сервісу: OSS IPTV",                             type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_oss_voip",            label: "Клієнти сервісу: OSS VoIP",                             type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_clients_oss_billing",         label: "Клієнти сервісу: OSS білінгу",                          type: "int", min: 1, max: 10_000_000, xIndex: idx() },

    // К-сть “сталих” клієнтів кожного сервісу (1..10^7)
    { key: "cnt_stable_pim",                  label: "Стабільні клієнти: PIM",                                 type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_cpq",                  label: "Стабільні клієнти: CPQ",                                 type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_order_mgmt",           label: "Стабільні клієнти: Order Management",                    type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_cim",                  label: "Стабільні клієнти: CIM",                                 type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_digital_sales",        label: "Стабільні клієнти: Product Digital Sales",               type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_pmwp_utm",             label: "Стабільні клієнти: BSS PMWP/UTM",                        type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_bss_pim",              label: "Стабільні клієнти: BSS PIM",                             type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_b2b_oc_ui",            label: "Стабільні клієнти: BSS B2B OC UI",                       type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_b2b_portal",           label: "Стабільні клієнти: BSS B2B Portal",                      type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_pnl_cost",             label: "Стабільні клієнти: BSS PnL and Cost Management",         type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_cloud_order_toe",      label: "Стабільні клієнти: Cloud Order Management TOE",          type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_bss_desktop",          label: "Стабільні клієнти: BSS Desktop",                         type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_oss_iptv",             label: "Стабільні клієнти: OSS IPTV",                            type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_oss_voip",             label: "Стабільні клієнти: OSS VoIP",                            type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_stable_oss_billing",          label: "Стабільні клієнти: OSS білінгу",                         type: "int", min: 1, max: 10_000_000, xIndex: idx() },

    // К-сть потенційних клієнтів кожного сервісу (1..10^7)
    { key: "cnt_potential_pim",               label: "Потенційні клієнти: PIM",                                 type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_cpq",               label: "Потенційні клієнти: CPQ",                                 type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_order_mgmt",        label: "Потенційні клієнти: Order Management",                    type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_cim",               label: "Потенційні клієнти: CIM",                                 type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_digital_sales",     label: "Потенційні клієнти: Product Digital Sales",               type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_pmwp_utm",          label: "Потенційні клієнти: BSS PMWP/UTM",                        type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_bss_pim",           label: "Потенційні клієнти: BSS PIM",                             type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_b2b_oc_ui",         label: "Потенційні клієнти: BSS B2B OC UI",                       type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_b2b_portal",        label: "Потенційні клієнти: BSS B2B Portal",                      type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_pnl_cost",          label: "Потенційні клієнти: BSS PnL and Cost Management",         type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_cloud_order_toe",   label: "Потенційні клієнти: Cloud Order Management TOE",          type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_bss_desktop",       label: "Потенційні клієнти: BSS Desktop",                         type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_oss_iptv",          label: "Потенційні клієнти: OSS IPTV",                            type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_oss_voip",          label: "Потенційні клієнти: OSS VoIP",                            type: "int", min: 1, max: 10_000_000, xIndex: idx() },
    { key: "cnt_potential_oss_billing",       label: "Потенційні клієнти: OSS білінгу",                         type: "int", min: 1, max: 10_000_000, xIndex: idx() },

    // К-сть клієнтів за типом
    { key: "cnt_type_b2c",                    label: "К-сть клієнтів за типом: B2C (1..10^6)",       type: "int", min: 1, max: 1_000_000,  xIndex: idx() },
    { key: "cnt_type_b2b",                    label: "К-сть клієнтів за типом: B2B (1..5·10^4)",     type: "int", min: 1, max: 50_000,     xIndex: idx() },
    { key: "cnt_type_smb",                    label: "К-сть клієнтів за типом: SMB (1..2·10^4)",     type: "int", min: 1, max: 20_000,     xIndex: idx() },
    { key: "cnt_type_enterprise",             label: "К-сть клієнтів за типом: Enterprise (1..100)", type: "int", min: 1, max: 100,        xIndex: idx() },

    // К-сть клієнтів за сегментом
    { key: "cnt_seg_mass",                    label: "К-сть клієнтів за сегментом: масовий (1..10^6)", type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_seg_premium",                 label: "К-сть клієнтів за сегментом: преміум (1..10^5)", type: "int", min: 1, max: 100_000,   xIndex: idx() },
    { key: "cnt_seg_business",                label: "К-сть клієнтів за сегментом: бізнес-клас (1..10^4)", type: "int", min: 1, max: 10_000, xIndex: idx() },

    // К-сть клієнтів за статусом (активний/заблокований/відключений)
    { key: "cnt_status_active",               label: "К-сть клієнтів: активний (1..10^6)",     type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_status_blocked",              label: "К-сть клієнтів: заблокований (1..10^5)", type: "int", min: 1, max: 100_000,   xIndex: idx() },
    { key: "cnt_status_disconnected",         label: "К-сть клієнтів: відключений (1..10^4)",  type: "int", min: 1, max: 10_000,    xIndex: idx() },

    // Активні підписки
    { key: "cnt_subs_mobile_postpaid",        label: "Активні підписки: Мобільний Postpaid (1..10^6)", type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_subs_mobile_prepaid",         label: "Активні підписки: Мобільний Prepaid (1..10^6)",  type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_subs_iptv",                   label: "Активні підписки: IPTV (1..10^6)",               type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_subs_internet",               label: "Активні підписки: Інтернет (1..10^6)",           type: "int", min: 1, max: 1_000_000, xIndex: idx() },

    // Період білінгу
    { key: "cnt_billing_monthly",             label: "К-сть клієнтів за білінгом: щомісячний (1..10^6)", type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_billing_yearly",              label: "К-сть клієнтів за білінгом: річний (1..10^6)",      type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_billing_flexible",            label: "К-сть клієнтів за білінгом: гнучкий (1..10^6)",     type: "int", min: 1, max: 1_000_000, xIndex: idx() },

    // Статус у програмі лояльності
    { key: "cnt_loyalty_basic",               label: "К-сть клієнтів у програмі лояльності: базовий (1..10^6)",   type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_loyalty_premium",             label: "К-сть клієнтів у програмі лояльності: преміум (1..10^6)",   type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "cnt_loyalty_vip",                 label: "К-сть клієнтів у програмі лояльності: VIP (1..10^6)",       type: "int", min: 1, max: 1_000_000, xIndex: idx() },

    // Підозріла активність
    { key: "cnt_suspicious",                  label: "К-сть клієнтів із ознаками шахрайства (1..10^6)", type: "int", min: 1, max: 1_000_000, xIndex: idx() },

    // Середні показники використання (1..10^6)
    { key: "avg_usage_calls_min",             label: "Середні показники: дзвінки, хв",   type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "avg_usage_internet_gb",           label: "Середні показники: Інтернет, GB",  type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "avg_usage_tv_gb",                 label: "Середні показники: TV, GB",        type: "int", min: 1, max: 1_000_000, xIndex: idx() },

    // Уподобані канали зв’язку (1..10^6)
    { key: "pref_channel_sms",                label: "Уподобані канали: SMS",            type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "pref_channel_email",              label: "Уподобані канали: email",          type: "int", min: 1, max: 1_000_000, xIndex: idx() },
    { key: "pref_channel_push",               label: "Уподобані канали: push-нотифікації", type: "int", min: 1, max: 1_000_000, xIndex: idx() },

    // Відсотки (0..99.99) → у X буде 0..1
    { key: "pct_gdpr_compliance",             label: "Процент відповідності даних GDPR",            type: "percent", xIndex: idx() },
    { key: "pct_with_debt",                   label: "Процент клієнтів із заборгованістю",         type: "percent", xIndex: idx() },
    { key: "pct_fin_stable",                  label: "Процент клієнтів фінансово стабільних",      type: "percent", xIndex: idx() },
    { key: "pct_family_plans",                label: "Процент клієнтів зі зв’язками: сімейні плани", type: "percent", xIndex: idx() },
    { key: "pct_business_accounts",           label: "Процент клієнтів зі зв’язками: бізнес-акаунти", type: "percent", xIndex: idx() },
    { key: "pct_auth_password",               label: "Процент клієнтів з аутентифікацією: пароль",   type: "percent", xIndex: idx() },
    { key: "pct_auth_2fa",                    label: "Процент клієнтів з аутентифікацією: 2FA",      type: "percent", xIndex: idx() },
    { key: "pct_auth_biometry",               label: "Процент клієнтів з аутентифікацією: біометрія", type: "percent", xIndex: idx() },
    { key: "pct_support_normal",              label: "Процент клієнтів за рівнем підтримки: звичайний",         type: "percent", xIndex: idx() },
    { key: "pct_support_priority",            label: "Процент клієнтів за рівнем підтримки: пріоритетний",      type: "percent", xIndex: idx() },
    { key: "pct_support_personal_manager",    label: "Процент клієнтів за рівнем підтримки: персональний менеджер", type: "percent", xIndex: idx() },
  ],
},

  {
  id: "g5",
  title: "Специфічні вимоги до сервісів",
  fields: [
    // Технології
    { key: "tech_lte",   label: "Технології: LTE",  type: "bool", xIndex: idx() },
    { key: "tech_5g",    label: "Технології: 5G",   type: "bool", xIndex: idx() },
    { key: "tech_gpon",  label: "Технології: GPON", type: "bool", xIndex: idx() },
    { key: "tech_sdn",   label: "Технології: SDN",  type: "bool", xIndex: idx() },
    { key: "tech_nfv",   label: "Технології: NFV",  type: "bool", xIndex: idx() },

    // Тип активації для OSS
    { key: "oss_activation_type1", label: "OSS: тип активації 1", type: "bool", xIndex: idx() },
    { key: "oss_activation_type2", label: "OSS: тип активації 2", type: "bool", xIndex: idx() },

    // Режим для Inventory
    { key: "inventory_mode1", label: "Inventory: режим 1", type: "bool", xIndex: idx() },
    { key: "inventory_mode2", label: "Inventory: режим 2", type: "bool", xIndex: idx() },

    // Ідентифікація та альтернативи
    { key: "service_ident_element", label: "Елемент сервіс-ідентифікації", type: "bool", xIndex: idx() },
    { key: "alt_service_1",         label: "Альтернативні сервіси: варіант 1", type: "bool", xIndex: idx() },
    { key: "alt_service_2",         label: "Альтернативні сервіси: варіант 2", type: "bool", xIndex: idx() },
    { key: "alt_service_3",         label: "Альтернативні сервіси: варіант 3", type: "bool", xIndex: idx() },
  ],
},

  {
  id: "g6",
  title: "Додаткові вимоги",
  fields: [
    // Сервіси третіх сторін (15 пунктів)
    { key: "tp_pim",                 label: "3rd-party: PIM",                                       type: "bool", xIndex: idx() },
    { key: "tp_cpq",                 label: "3rd-party: Компонент квотації CPQ",                    type: "bool", xIndex: idx() },
    { key: "tp_order_mgmt",          label: "3rd-party: Order Management",                          type: "bool", xIndex: idx() },
    { key: "tp_cim",                 label: "3rd-party: Customer Information Management",           type: "bool", xIndex: idx() },
    { key: "tp_digital_sales",       label: "3rd-party: Product Digital Sales",                     type: "bool", xIndex: idx() },
    { key: "tp_pmwp_utm",            label: "3rd-party: BSS PMWP/UTM",                              type: "bool", xIndex: idx() },
    { key: "tp_bss_pim",             label: "3rd-party: BSS PIM",                                   type: "bool", xIndex: idx() },
    { key: "tp_b2b_oc_ui",           label: "3rd-party: BSS B2B OC UI",                             type: "bool", xIndex: idx() },
    { key: "tp_b2b_portal",          label: "3rd-party: BSS B2B Portal",                            type: "bool", xIndex: idx() },
    { key: "tp_pnl_cost",            label: "3rd-party: BSS PnL and Cost Management",               type: "bool", xIndex: idx() },
    { key: "tp_cloud_order_toe",     label: "3rd-party: BSS Cloud Order Management TOE",            type: "bool", xIndex: idx() },
    { key: "tp_bss_desktop",         label: "3rd-party: BSS Desktop",                               type: "bool", xIndex: idx() },
    { key: "tp_oss_iptv",            label: "3rd-party: OSS IPTV",                                  type: "bool", xIndex: idx() },
    { key: "tp_oss_voip",            label: "3rd-party: OSS VoIP",                                  type: "bool", xIndex: idx() },
    { key: "tp_oss_billing",         label: "3rd-party: OSS білінгу",                               type: "bool", xIndex: idx() },

    // Майстри даних провайдера (вільний список — не йде в X)
    { key: "master_systems_list",    label: "Інформаційні системи — майстри даних (список)", type: "text", noX: true },

    // Окремі додаткові компоненти
    { key: "op_workplace",           label: "Робоче місце оператора",        type: "bool", xIndex: idx() },
    { key: "personal_cabinet",       label: "Особистий кабінет",             type: "bool", xIndex: idx() },
    { key: "catalog_with_calc",      label: "Каталог з калькуляцією",        type: "bool", xIndex: idx() },
    { key: "activation_module",      label: "Модуль активації",              type: "bool", xIndex: idx() },
    { key: "notify_component",       label: "Компонент нотифікації",         type: "bool", xIndex: idx() },
    { key: "sms_component",          label: "Компонент SMS-інформування",    type: "bool", xIndex: idx() },
    { key: "viber_component",        label: "Компонент Viber-інформування",  type: "bool", xIndex: idx() },
    { key: "tariff_change_component",label: "Компонент зміни тарифного плану", type: "bool", xIndex: idx() },
    { key: "static_ip",              label: "Статична IP",                    type: "bool", xIndex: idx() },
  ],
},
];
export function buildDefaultValuesFromSchema(schema) {
  const out = {};
  for (const g of schema) {
    const gv = {};
    for (const f of g.fields) {
      if (f.noX) {
        // текстові/службові — можна лишити порожні, але не обов'язково
        continue;
      }
      if (f.type === "select") {
        // перша опція або 0
        if (Array.isArray(f.options) && f.options.length) {
          const first = f.options[0];
          gv[f.key] = typeof first === "object" && first !== null
            ? (first.value ?? 0)
            : 0;
        } else {
          gv[f.key] = 0;
        }
      } else {
        gv[f.key] = 0; // bool/int/float/percent → 0
      }
    }
    out[g.id] = gv;
  }
  return out;
}
// 1) Форс-ренумерація, щоб не було дублів узагалі
const actualLen = forceReindexSchema(X_SCHEMA, 0);

// 2) Перевірка та підказки
validateXSchema(X_SCHEMA);
console.info(`x_schema: матеріалізована довжина = ${actualLen} (очікувана = ${EXPECTED_LEN})`);
