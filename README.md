# 🍲 MeiDia Delivery

Sistema completo de pedidos online para restaurantes, criado para eliminar as altas taxas cobradas pelos aplicativos de delivery tradicionais e dar controle total ao dono do negócio.

🔗 **Site de pedidos (ao vivo):** https://meidiapedidos.netlify.app/
🔗 **Painel administrativo (ao vivo):** https://meidia-admin.netlify.app/

## 📱 Sobre o projeto

O MeiDia nasceu da necessidade real de um pequeno negócio de comida que sofria com as taxas de marketplaces de delivery. A solução: uma plataforma própria, sem intermediários, com pagamento direto via PIX e pedidos formatados enviados automaticamente para o WhatsApp do restaurante.

O sistema já está em produção, atendendo um cliente real.

## ✨ Funcionalidades

**Site do cliente:**
- Cardápio digital organizado por categorias, com fotos e disponibilidade em tempo real
- Carrinho de compras com cupons de desconto
- Cálculo automático de frete por zona de entrega (km)
- Escolha entre entrega ou retirada
- Pagamento via PIX com QR Code e copia-e-cola gerados automaticamente
- Pedido enviado formatado direto para o WhatsApp do restaurante
- Acompanhamento do status do pedido em tempo real, sem precisar recarregar a página

**Painel administrativo:**
- Gestão completa do cardápio (pratos, fotos, preços, categorias)
- Gerenciamento de pedidos em tempo real
- Avaliações de clientes com aprovação/moderação
- Configuração de zonas de entrega e valores por km
- Mensagens automáticas de WhatsApp por status do pedido
- Sistema de cupons de desconto
- Relatórios exportáveis em PDF (diário, semanal e mensal)
- Configurações do negócio (horário de funcionamento, chave PIX, endereço de retirada)

## 🛠️ Tecnologias utilizadas

- HTML, CSS e JavaScript
- Firebase (Firestore + Authentication) — banco de dados e login do painel admin
- Geração de QR Code PIX no padrão EMV
- Integração com WhatsApp para envio automático de pedidos
- Deploy via Netlify

## 👤 Autor

Desenvolvido por **Eduardo Guedes** ([@3DVLOG](https://github.com/3Duguedes)) — (contato@glinksolucoes.com.br)
