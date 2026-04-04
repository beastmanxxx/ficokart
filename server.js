const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Nodemailer Transporter Configuration
// Bhai, yahan aapko apni Gmail ID aur App Password dalna hoga
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'moghaeashu@gmail.com', // Aapki email id
        pass: 'uqdc djwy qjup obni'    // Gmail App Password (Normal password nahi chalega)
    }
});

// Endpoint to send order notification
app.post('/send-order-email', (req, res) => {
    const { orderData, adminEmails } = req.body;

    if (!orderData || !adminEmails) {
        return res.status(400).send({ message: 'Order data or Admin emails missing' });
    }

    // Build the email content
    let itemsHtml = '';
    if (orderData.items && orderData.items.length > 0) {
        itemsHtml = `
            <h3>Items in Cart:</h3>
            <table border="1" style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f1f1f1;">
                        <th style="padding: 8px;">Image</th>
                        <th style="padding: 8px;">Product</th>
                        <th style="padding: 8px;">Size/Color</th>
                        <th style="padding: 8px;">Qty</th>
                        <th style="padding: 8px;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${orderData.items.map(item => `
                        <tr>
                            <td style="padding: 8px; text-align: center;">
                                <img src="${item.imageUrl || item.productImage || ''}" width="50" height="50" style="border-radius: 5px; object-fit: cover;">
                            </td>
                            <td style="padding: 8px;">${item.name}</td>
                            <td style="padding: 8px;">${item.selectedSize || item.productSize || item.size || 'No Size'} / ${item.selectedColor || item.color || 'No Color'}</td>
                            <td style="padding: 8px;">${item.quantity}</td>
                            <td style="padding: 8px;">₹${item.price}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } else {
        itemsHtml = `
            <div style="display: flex; align-items: center; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
                <img src="${orderData.productImage || ''}" width="100" style="border-radius: 8px; margin-right: 15px;">
                <div>
                    <p><strong>Product:</strong> ${orderData.productName}</p>
                    <p><strong>Price:</strong> ₹${orderData.productPrice}</p>
                    <p><strong>Size/Color:</strong> ${orderData.selectedSize || orderData.productSize || orderData.size || 'N/A'} / ${orderData.selectedColor || orderData.color || 'N/A'}</p>
                    <p><strong>Quantity:</strong> ${orderData.quantity}</p>
                </div>
            </div>
        `;
    }

    const mailOptions = {
        from: '"FicoKart Orders" <YOUR_EMAIL@gmail.com>',
        to: adminEmails.join(','),
        subject: `🛍️ New Order: ₹${orderData.totalAmount} from ${orderData.userName}`,
        html: `
            <div style="background-color: #f8f9fa; padding: 40px 10px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #eee;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0; font-size: 24px; letter-spacing: 1px;">New Order Notification</h1>
                        <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">FicoKart E-Commerce Platform</p>
                    </div>

                    <!-- Customer Info Section -->
                    <div style="padding: 25px; border-bottom: 1px dashed #eee;">
                        <h3 style="color: #2c3e50; margin: 0 0 15px 0;">👤 Customer Details</h3>
                        <table style="width: 100%; border-spacing: 0;">
                            <tr>
                                <td style="padding: 5px 0; color: #7f8c8d; width: 120px;">Name:</td>
                                <td style="padding: 5px 0; color: #2c3e50; font-weight: 600;">${orderData.userName}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #7f8c8d;">Email:</td>
                                <td style="padding: 5px 0; color: #2c3e50;">${orderData.userEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #7f8c8d;">Phone:</td>
                                <td style="padding: 5px 0; color: #2c3e50;">${orderData.userPhone}</td>
                            </tr>
                            <tr>
                                <td style="padding: 5px 0; color: #7f8c8d; vertical-align: top;">Address:</td>
                                <td style="padding: 5px 0; color: #2c3e50; line-height: 1.4;">${orderData.userAddress}</td>
                            </tr>
                        </table>
                    </div>

                    <!-- Order Summary -->
                    <div style="padding: 25px;">
                        <h3 style="color: #2c3e50; margin: 0 0 15px 0;">📦 Order Summary</h3>
                        
                        ${orderData.items && orderData.items.length > 0 ? `
                            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #f1f1f1;">
                                        <th style="padding: 10px 0; text-align: left; color: #95a5a6; font-size: 13px;">Item</th>
                                        <th style="padding: 10px 0; text-align: center; color: #95a5a6; font-size: 13px;">Qty</th>
                                        <th style="padding: 10px 0; text-align: right; color: #95a5a6; font-size: 13px;">Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${orderData.items.map(item => `
                                        <tr style="border-bottom: 1px solid #f8f9fa;">
                                            <td style="padding: 12px 0;">
                                                <div style="display: flex; align-items: center;">
                                                    <img src="${item.imageUrl || item.productImage || ''}" width="40" height="40" style="border-radius: 4px; object-fit: cover; border: 1px solid #eee;">
                                                    <div style="margin-left: 10px;">
                                                        <div style="color: #2c3e50; font-weight: 500; font-size: 14px;">${item.name}</div>
                                                        <div style="color: #95a5a6; font-size: 12px;">${item.selectedSize || item.productSize || item.size || 'N/A'} | ${item.selectedColor || item.color || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding: 12px 0; text-align: center; color: #2c3e50;">${item.quantity}</td>
                                            <td style="padding: 12px 0; text-align: right; color: #2c3e50; font-weight: 600;">₹${item.price}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        ` : `
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center;">
                                <img src="${orderData.productImage || ''}" width="60" height="60" style="border-radius: 6px; object-fit: cover; border: 1px solid #eee;">
                                <div style="margin-left: 15px;">
                                    <div style="color: #2c3e50; font-weight: 600;">${orderData.productName}</div>
                                    <div style="color: #95a5a6; font-size: 13px; margin: 3px 0;">${orderData.selectedSize || orderData.productSize || orderData.size || 'N/A'} | ${orderData.selectedColor || orderData.color || 'N/A'}</div>
                                    <div style="color: #2c3e50;">Qty: ${orderData.quantity}</div>
                                </div>
                            </div>
                        `}

                        <!-- Totals Bar -->
                        <div style="background: #f1f8f4; padding: 15px; border-radius: 8px;">
                            <table style="width: 100%; border-spacing: 0;">
                                <tr>
                                    <td style="color: #27ae60; font-weight: 600;">PAYMENT MODE:</td>
                                    <td style="text-align: right; color: #27ae60; font-weight: 600;">${orderData.paymentMethod.toUpperCase()}</td>
                                </tr>
                                <tr>
                                    <td style="color: #2c3e50; font-weight: 700; font-size: 18px; padding-top: 10px;">TOTAL AMOUNT:</td>
                                    <td style="text-align: right; color: #e74c3c; font-weight: 700; font-size: 20px; padding-top: 10px;">₹${orderData.totalAmount}</td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Footer / Actions -->
                    <div style="padding: 0 25px 30px 25px; text-align: center;">
                        ${orderData.googleMapsLink ? `
                            <a href="${orderData.googleMapsLink}" style="display: block; background: #27ae60; color: white; padding: 14px 20px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px; margin-bottom: 20px;">📍 View Delivery Location on Map</a>
                        ` : ''}
                        <p style="color: #95a5a6; font-size: 12px; margin: 0;">OrderID: <strong>${orderData.id || 'N/A'}</strong></p>
                        <p style="color: #bdc3c7; font-size: 11px; margin-top: 5px;">Generated automatically at ${new Date().toLocaleString()}</p>
                    </div>

                </div>
            </div>
        `
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
            return res.status(500).send({ message: 'Error sending email', error: error.toString() });
        }
        console.log('Email sent: ' + info.response);
        res.status(200).send({ message: 'Order notification sent successfully!' });
    });
});

app.listen(PORT, () => {
    console.log(`Backend Server is running on http://localhost:${PORT}`);
    console.log(`Admin email notifications are ready.`);
});
