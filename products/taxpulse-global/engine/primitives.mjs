const TaxEnginePrimitives = {
      progressive_brackets(taxableBase, brackets) {
        const base = Math.max(0, Number(taxableBase) || 0);
        let totalTax = 0;
        let marginalRate = (brackets && brackets.length > 0) ? brackets[0].rate : 0;
        const tiers = (brackets || []).map(b => {
          const min = Number(b.min) || 0;
          const max = (b.max === null || b.max === undefined) ? Infinity : Number(b.max);
          const taxableInTier = Math.max(0, Math.min(base, max) - min);
          const taxInTier = taxableInTier * b.rate;
          totalTax += taxInTier;
          if (base > min) marginalRate = b.rate;
          return { min, max: b.max, rate: b.rate, taxableInTier, taxInTier };
        });
        return { primitive: 'progressive_brackets', taxableBase: base, totalTax, marginalRate, effectiveRate: base > 0 ? totalTax / base : 0, tiers };
      },

      capped_percentage(grossWage, rules) {
        const wage = Math.max(0, Number(grossWage) || 0);
        let totalContribution = 0;
        const items = (rules || []).map(r => {
          const floor = Number(r.min_Floor !== undefined ? r.min_Floor : r.exemption) || 0;
          const rawCap = r.annual_cap !== undefined ? r.annual_cap : r.cap;
          const cap = (rawCap === null || rawCap === undefined) ? Infinity : Number(rawCap);
          const subjectWage = Math.max(0, Math.min(wage, cap) - floor);
          const amount = subjectWage * (Number(r.rate) || 0);
          totalContribution += amount;
          return { name: r.name, rate: Number(r.rate) || 0, floor, cap: rawCap, subjectWage, amount, note: r.note || '' };
        });
        return { primitive: 'capped_percentage', grossWage: wage, totalContribution, effectiveRate: wage > 0 ? totalContribution / wage : 0, items };
      },

      flat_or_slab_lookup({ amount, rate, exemption = 0, surtaxOrCessRate = 0, mode = 'exclusive' }) {
        const rawAmount = Math.max(0, Number(amount) || 0);
        const r = Math.max(0, Number(rate) || 0);
        const ex = Math.max(0, Number(exemption) || 0);
        const cess = Math.max(0, Number(surtaxOrCessRate) || 0);

        if (mode === 'inclusive') {
          const netAmount = r > 0 ? rawAmount / (1 + r) : rawAmount;
          const baseTax = rawAmount - netAmount;
          const surtaxAmount = baseTax * cess;
          const totalTax = baseTax + surtaxAmount;
          return {
            primitive: 'flat_or_slab_lookup',
            mode: 'inclusive',
            netAmount,
            exemptionApplied: 0,
            taxableBase: netAmount,
            rate: r,
            baseTax,
            surtaxAmount,
            totalTax,
            grossAmount: rawAmount + surtaxAmount,
            effectiveRate: rawAmount > 0 ? totalTax / rawAmount : 0
          };
        }

        const exemptionApplied = Math.min(rawAmount, ex);
        const taxableBase = Math.max(0, rawAmount - exemptionApplied);
        const baseTax = taxableBase * r;
        const surtaxAmount = baseTax * cess;
        const totalTax = baseTax + surtaxAmount;
        return {
          primitive: 'flat_or_slab_lookup',
          mode: 'exclusive',
          netAmount: rawAmount,
          exemptionApplied,
          taxableBase,
          rate: r,
          baseTax,
          surtaxAmount,
          totalTax,
          grossAmount: rawAmount + totalTax,
          effectiveRate: rawAmount > 0 ? totalTax / rawAmount : 0
        };
      },

      treaty_offset({ grossIncome, sourceDomesticWhtRate, treatyWhtRate, residenceTaxRate, applyTreaty = true }) {
        const gross = Math.max(0, Number(grossIncome) || 0);
        const srcStatutoryRate = Math.max(0, Number(sourceDomesticWhtRate) || 0);
        const dtaaCapRate = Math.max(0, Number(treatyWhtRate) || 0);
        const resRate = Math.max(0, Number(residenceTaxRate) || 0);

        const appliedSourceRate = applyTreaty ? Math.min(srcStatutoryRate, dtaaCapRate) : srcStatutoryRate;
        const foreign_tax_paid = gross * appliedSourceRate;
        const domestic_tax = gross * resRate;
        const treaty_cap = Math.min(gross * dtaaCapRate, domestic_tax);

        const foreignTaxCreditAllowed = Math.min(foreign_tax_paid, treaty_cap);
        const residualResidenceTax = Math.max(0, domestic_tax - foreignTaxCreditAllowed);
        const totalGlobalTax = foreign_tax_paid + residualResidenceTax;
        const treatySavingsAtSource = Math.max(0, (gross * srcStatutoryRate) - foreign_tax_paid);

        return {
          primitive: 'treaty_offset',
          grossIncome: gross,
          appliedSourceRate,
          foreignTaxPaid: foreign_tax_paid,
          domesticTaxBeforeCredit: domestic_tax,
          treatyCapAmount: treaty_cap,
          foreignTaxCreditAllowed,
          residualResidenceTax,
          totalGlobalTax,
          treatySavingsAtSource,
          netPostTaxIncome: Math.max(0, gross - totalGlobalTax),
          effectiveGlobalTaxRate: gross > 0 ? totalGlobalTax / gross : 0
        };
      }
    };
export { TaxEnginePrimitives };
